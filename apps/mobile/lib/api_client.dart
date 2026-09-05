import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// 与 apps/api 的响应结构对齐的最小模型（MVP 手写解析；结构化生成后续引入）。
class RunRecord {
  RunRecord({
    required this.id,
    required this.task,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String task;
  final String status;
  final String createdAt;

  factory RunRecord.fromJson(Map<String, dynamic> json) => RunRecord(
        id: json['id'] as String,
        task: json['task'] as String,
        status: json['status'] as String,
        createdAt: json['createdAt'] as String,
      );

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

  factory PendingApproval.fromJson(Map<String, dynamic> json) => PendingApproval(
        id: json['id'] as String,
        runId: json['runId'] as String,
        toolName: json['toolName'] as String,
        reason: json['reason'] as String,
      );
}

/// ForgeApiClient：Dio 封装；baseUrl 可在设置页修改，令牌存安全存储。
class ForgeApiClient {
  ForgeApiClient({required String baseUrl})
      : _dio = Dio(BaseOptions(
          baseUrl: '$baseUrl/api/v1',
          connectTimeout: const Duration(seconds: 10),
        ));

  final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  static const _tokenKey = 'forge.accessToken';

  Future<void> saveToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<String?> readToken() => _storage.read(key: _tokenKey);

  Future<void> clearToken() => _storage.delete(key: _tokenKey);

  Future<Options> _auth() async {
    final token = await readToken();
    return Options(headers: {
      if (token != null && token.isNotEmpty) 'authorization': 'Bearer $token',
    });
  }

  Future<List<RunRecord>> listRuns() async {
    final response = await _dio.get<List<dynamic>>('/runs',
        options: await _auth());
    return response.data!
        .map((item) => RunRecord.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<RunRecord> getRun(String id) async {
    final response =
        await _dio.get<Map<String, dynamic>>('/runs/$id', options: await _auth());
    return RunRecord.fromJson(response.data!);
  }

  Future<List<PendingApproval>> listPendingApprovals() async {
    final response = await _dio.get<List<dynamic>>('/approvals/pending',
        options: await _auth());
    return response.data!
        .map((item) => PendingApproval.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> decideApproval(String id, bool approved) async {
    await _dio.post('/approvals/$id/decision',
        data: {'decision': approved ? 'approved' : 'rejected'},
        options: await _auth());
  }
}
