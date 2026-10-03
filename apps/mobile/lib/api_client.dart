import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// 与 apps/api 的响应结构对齐的最小模型（MVP 手写解析；结构化生成后续引入）。
class RunRecord {
  RunRecord({
    required this.id,
    required this.task,
    required this.status,
    required this.createdAt,
    this.error,
    this.events = const [],
  });

  final String id;
  final String task;
  final String status;
  final String createdAt;
  final String? error;
  final List<dynamic> events;

  factory RunRecord.fromJson(Map<String, dynamic> json) => RunRecord(
    id: json['id'] as String,
    task: json['task'] as String,
    status: json['status'] as String,
    createdAt: json['createdAt'] as String,
    error: json['error'] as String?,
    events: (json['events'] as List<dynamic>?) ?? const [],
  );

  /// 从事件流提取最终模型输出（model.delta 文本按序拼接）。
  String get output => events
      .whereType<Map<String, dynamic>>()
      .where((event) => event['name'] == 'model.delta')
      .map(
        (event) =>
            ((event['payload'] as Map<String, dynamic>?)?['text'] as String?) ??
            '',
      )
      .join();

  /// model.completed 事件上报的 token 用量合计；无用量上报时为 null。
  int? get totalTokens {
    int? total;
    for (final event in events.whereType<Map<String, dynamic>>()) {
      if (event['name'] != 'model.completed') continue;
      final payload = event['payload'] as Map<String, dynamic>?;
      final input = payload?['inputTokens'];
      final output = payload?['outputTokens'];
      total =
          (total ?? 0) +
          (input is num ? input.toInt() : 0) +
          (output is num ? output.toInt() : 0);
    }
    return total;
  }

  bool get isTerminal =>
      const {'completed', 'failed', 'cancelled', 'timeout'}.contains(status);
}

class PendingApproval {
  PendingApproval({
    required this.id,
    required this.runId,
    required this.toolName,
    required this.reason,
  });

  final String id;
  final String runId;
  final String toolName;
  final String reason;

  factory PendingApproval.fromJson(Map<String, dynamic> json) =>
      PendingApproval(
        id: json['id'] as String,
        runId: json['runId'] as String,
        toolName: json['toolName'] as String,
        reason: json['reason'] as String,
      );
}

class AuthResult {
  AuthResult({required this.accessToken, required this.username});

  final String accessToken;
  final String username;

  factory AuthResult.fromJson(Map<String, dynamic> json) => AuthResult(
    accessToken: json['accessToken'] as String,
    username: json['username'] as String,
  );
}

/// ForgeApiClient：Dio 封装；baseUrl 可在设置页修改，令牌存安全存储。
/// [dio] 仅测试注入使用。
class ForgeApiClient {
  ForgeApiClient({required String baseUrl, Dio? dio})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: '$baseUrl/api/v1',
              connectTimeout: const Duration(seconds: 10),
            ),
          );

  final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  static const _tokenKey = 'forge.accessToken';

  Future<void> saveToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<String?> readToken() => _storage.read(key: _tokenKey);

  Future<void> clearToken() => _storage.delete(key: _tokenKey);

  Future<Options> _auth() async {
    final token = await readToken();
    return Options(
      headers: {
        if (token != null && token.isNotEmpty) 'authorization': 'Bearer $token',
      },
    );
  }

  Future<AuthResult> login(String username, String password) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'username': username, 'password': password},
    );
    final result = AuthResult.fromJson(response.data!);
    await saveToken(result.accessToken);
    return result;
  }

  Future<AuthResult> register(String username, String password) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/auth/register',
      data: {'username': username, 'password': password},
    );
    final result = AuthResult.fromJson(response.data!);
    await saveToken(result.accessToken);
    return result;
  }

  Future<RunRecord> createRun(String task, {String? agentName}) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/runs',
      data: agentName == null
          ? {'task': task}
          : {'task': task, 'agentName': agentName},
      options: await _auth(),
    );
    return RunRecord.fromJson(response.data!);
  }

  Future<List<RunRecord>> listRuns() async {
    final response = await _dio.get<List<dynamic>>(
      '/runs',
      options: await _auth(),
    );
    return response.data!
        .map((item) => RunRecord.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<RunRecord> getRun(String id) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/runs/$id',
      options: await _auth(),
    );
    return RunRecord.fromJson(response.data!);
  }

  Future<List<ConversationSummary>> listConversations() async {
    final response = await _dio.get<List<dynamic>>(
      '/conversations',
      options: await _auth(),
    );
    return response.data!
        .map(
          (item) => ConversationSummary.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<ConversationRecord> createConversation(String agentName) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/conversations',
      data: {'agentName': agentName},
      options: await _auth(),
    );
    return ConversationRecord.fromJson(response.data!);
  }

  Future<ConversationRecord> fetchConversation(String id) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/conversations/$id',
      options: await _auth(),
    );
    return ConversationRecord.fromJson(response.data!);
  }

  /// 对比报告导出（CSV / Markdown 文本）。
  Future<String> exportComparison(String id, String format) async {
    final response = await _dio.get<String>(
      '/comparisons/$id/export/$format',
      options: await _auth(),
    );
    return response.data ?? '';
  }

  Future<void> deleteConversation(String id) async {
    await _dio.delete('/conversations/$id', options: await _auth());
  }

  Future<void> appendConversationMessage(
    String id,
    ChatMessageRecord message,
  ) async {
    await _dio.post(
      '/conversations/$id/messages',
      data: message.toJson(),
      options: await _auth(),
    );
  }

  Future<RunRecord> cancelRun(String id) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/runs/$id/cancel',
      options: await _auth(),
    );
    return RunRecord.fromJson(response.data!);
  }

  Future<RunRecord> retryRun(String id) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/runs/$id/retry',
      options: await _auth(),
    );
    return RunRecord.fromJson(response.data!);
  }

  /// 对比批次摘要列表（含 task / agentName 列表）。
  Future<List<Map<String, dynamic>>> listComparisons() async {
    final response = await _dio.get<List<dynamic>>(
      '/comparisons',
      options: await _auth(),
    );
    return response.data!.map((item) => item as Map<String, dynamic>).toList();
  }

  /// 对比批次详情（含从 Run 派生的结果）。
  Future<Map<String, dynamic>> fetchComparison(String id) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/comparisons/$id',
      options: await _auth(),
    );
    return response.data!;
  }

  /// 跨批次统计：按 Agent 聚合（参与数/完成/失败/平均耗时/最快胜出）。
  Future<List<Map<String, dynamic>>> fetchComparisonStats() async {
    final response = await _dio.get<List<dynamic>>(
      '/comparisons/stats',
      options: await _auth(),
    );
    return response.data!.map((item) => item as Map<String, dynamic>).toList();
  }

  /// 跨批次统计：按模型聚合（同一结构，key 为模型名）。
  Future<List<Map<String, dynamic>>> fetchComparisonStatsByModel() async {
    final response = await _dio.get<List<dynamic>>(
      '/comparisons/stats/by-model',
      options: await _auth(),
    );
    return response.data!.map((item) => item as Map<String, dynamic>).toList();
  }

  /// Skill 库只读列表（name/description/instructions/enabled）。
  Future<List<Map<String, dynamic>>> fetchSkills() async {
    final response = await _dio.get<List<dynamic>>(
      '/skills',
      options: await _auth(),
    );
    return response.data!.map((item) => item as Map<String, dynamic>).toList();
  }

  /// 自定义 Agent 摘要列表（name/description/model）。
  Future<List<Map<String, dynamic>>> fetchAgents() async {
    final response = await _dio.get<List<dynamic>>(
      '/agents',
      options: await _auth(),
    );
    return response.data!.map((item) => item as Map<String, dynamic>).toList();
  }

  /// 任务台账只读列表（title/runId/status/createdAt）。
  Future<List<Map<String, dynamic>>> fetchTasks() async {
    final response = await _dio.get<List<dynamic>>(
      '/tasks',
      options: await _auth(),
    );
    return response.data!.map((item) => item as Map<String, dynamic>).toList();
  }

  Future<List<PendingApproval>> listPendingApprovals() async {
    final response = await _dio.get<List<dynamic>>(
      '/approvals/pending',
      options: await _auth(),
    );
    return response.data!
        .map((item) => PendingApproval.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> decideApproval(String id, bool approved) async {
    await _dio.post(
      '/approvals/$id/decision',
      data: {'decision': approved ? 'approved' : 'rejected'},
      options: await _auth(),
    );
  }
}

/// Chat 会话消息（与 apps/api conversations 存储形状对齐）。
class ChatMessageRecord {
  ChatMessageRecord({
    required this.role,
    required this.text,
    this.runId,
    this.status = 'completed',
    this.error,
    this.tools = const [],
  });

  final String role;
  final String text;
  final String? runId;
  final String status;
  final String? error;
  final List<String> tools;

  factory ChatMessageRecord.fromJson(Map<String, dynamic> json) =>
      ChatMessageRecord(
        role: json['role'] as String,
        text: json['text'] as String,
        runId: json['runId'] as String?,
        status: (json['status'] as String?) ?? 'completed',
        error: json['error'] as String?,
        tools: ((json['tools'] as List<dynamic>?) ?? const [])
            .map((tool) => tool as String)
            .toList(),
      );

  Map<String, dynamic> toJson() => {
    'role': role,
    'text': text,
    if (runId != null) 'runId': runId,
    'status': status,
    if (error != null) 'error': error,
    'tools': tools,
  };
}

class ConversationRecord {
  ConversationRecord({
    required this.id,
    required this.title,
    required this.agentName,
    required this.messages,
    required this.createdAt,
  });

  final String id;
  final String title;
  final String agentName;
  final List<ChatMessageRecord> messages;
  final String createdAt;

  factory ConversationRecord.fromJson(Map<String, dynamic> json) =>
      ConversationRecord(
        id: json['id'] as String,
        title: (json['title'] as String?) ?? '',
        agentName: (json['agentName'] as String?) ?? 'forge-dev',
        messages: ((json['messages'] as List<dynamic>?) ?? const [])
            .map(
              (item) =>
                  ChatMessageRecord.fromJson(item as Map<String, dynamic>),
            )
            .toList(),
        createdAt: json['createdAt'] as String,
      );
}

class ConversationSummary {
  ConversationSummary({
    required this.id,
    required this.title,
    required this.messageCount,
  });

  final String id;
  final String title;
  final int messageCount;

  factory ConversationSummary.fromJson(Map<String, dynamic> json) =>
      ConversationSummary(
        id: json['id'] as String,
        title: (json['title'] as String?) ?? '',
        messageCount: (json['messageCount'] as int?) ?? 0,
      );
}
