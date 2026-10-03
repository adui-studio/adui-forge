import 'dart:async';

import 'package:adui_forge/api_client.dart';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// 只记录「方法 + 路径」并返回空 JSON 的假适配器：响应解析失败会被
/// 测试里的 attempt 吞掉，断言只关心 URL 是否正确插值。
class _CapturingAdapter implements HttpClientAdapter {
  final recorded = <String>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    recorded.add('${options.method} ${options.uri.path}');
    return ResponseBody.fromString(
      '{}',
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    // flutter_secure_storage 的平台通道在测试环境不存在，mock 为空实现
    // （read 返回 null 即无 token，不影响 URL 断言）。
    const channel = MethodChannel(
      'plugins.it_nomads.com/flutter_secure_storage',
    );
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async => null);
  });

  test('所有携带路径参数的请求 URL 均正确插值（防路径变量被吞掉回归）', () async {
    final adapter = _CapturingAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'http://test'))
      ..httpClientAdapter = adapter;
    final client = ForgeApiClient(baseUrl: 'http://test', dio: dio);

    // 假适配器返回 {}，fromJson 解析会抛错；这里只关心请求路径。
    Future<void> attempt(Future<void> future) async {
      try {
        await future;
      } catch (_) {}
    }

    await attempt(client.getRun('r1'));
    await attempt(client.cancelRun('r1'));
    await attempt(client.retryRun('r1'));
    await attempt(client.fetchConversation('c1'));
    await attempt(client.deleteConversation('c1'));
    await attempt(client.renameConversation('c1', '新标题'));
    await attempt(
      client.appendConversationMessage(
        'c1',
        ChatMessageRecord(role: 'user', text: 'hi'),
      ),
    );
    await attempt(client.exportComparison('cmp1', 'csv'));
    await attempt(client.fetchComparison('cmp1'));
    await attempt(client.decideApproval('a1', true));

    expect(adapter.recorded, [
      'GET /runs/r1',
      'POST /runs/r1/cancel',
      'POST /runs/r1/retry',
      'GET /conversations/c1',
      'DELETE /conversations/c1',
      'PATCH /conversations/c1/title',
      'POST /conversations/c1/messages',
      'GET /comparisons/cmp1/export/csv',
      'GET /comparisons/cmp1',
      'POST /approvals/a1/decision',
    ]);
  });
}
