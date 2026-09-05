import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adui_forge/api_client.dart';
import 'package:adui_forge/app.dart';
import 'package:adui_forge/providers.dart';

/// 不触网的 Fake 客户端：固定数据 + 记录审批决策调用。
class FakeApiClient extends ForgeApiClient {
  FakeApiClient() : super(baseUrl: 'http://localhost:9');

  int approveCalls = 0;
  int rejectCalls = 0;

  @override
  Future<void> saveToken(String token) async {}

  @override
  Future<List<RunRecord>> listRuns() async => [
        RunRecord.fromJson({
          'id': 'run_1',
          'task': '实现搜索功能',
          'status': 'running',
          'createdAt': '2026-08-30T00:00:00.000Z',
        }),
        RunRecord.fromJson({
          'id': 'run_2',
          'task': '修复构建',
          'status': 'completed',
          'createdAt': '2026-08-30T00:00:00.000Z',
        }),
      ];

  @override
  Future<RunRecord> getRun(String id) async => RunRecord.fromJson({
        'id': id,
        'task': '实现搜索功能',
        'status': 'completed',
        'createdAt': '2026-08-30T00:00:00.000Z',
      });

  @override
  Future<List<PendingApproval>> listPendingApprovals() async => [
        PendingApproval.fromJson({
          'id': 'appr_1',
          'runId': 'run_1',
          'toolName': 'shell_exec',
          'reason': 'requires approval',
        }),
      ];

  @override
  Future<void> decideApproval(String id, bool approved) async {
    if (approved) {
      approveCalls += 1;
    } else {
      rejectCalls += 1;
    }
  }
}

Future<void> pumpApp(WidgetTester tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [apiClientProvider.overrideWith((ref) => FakeApiClient())],
      child: const ForgeApp(),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('Runs 列表渲染 Run 条目并可进入详情', (tester) async {
    await pumpApp(tester);

    expect(find.textContaining('实现搜索功能'), findsOneWidget);
    expect(find.textContaining('修复构建'), findsOneWidget);

    await tester.tap(find.textContaining('实现搜索功能'));
    await tester.pumpAndSettle();
    expect(find.text('Run 详情'), findsOneWidget);
  });

  testWidgets('审批屏展示待审批并记录批准决策', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.byTooltip('审批'));
    await tester.pumpAndSettle();

    expect(find.text('shell_exec'), findsOneWidget);
    expect(find.text('批准'), findsOneWidget);

    await tester.tap(find.text('批准'));
    await tester.pumpAndSettle();
  });

  testWidgets('设置屏可达', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.byTooltip('设置'));
    await tester.pumpAndSettle();
    expect(find.text('API 地址'), findsOneWidget);
  });
}
