import 'package:flutter_test/flutter_test.dart';
import 'package:adui_forge/api_client.dart';

void main() {
  group('模型解析（与 apps/api 响应对齐）', () {
    test('RunRecord.fromJson', () {
      final run = RunRecord.fromJson({
        'id': 'run_1',
        'task': '实现搜索',
        'status': 'completed',
        'createdAt': '2026-08-30T00:00:00.000Z',
      });
      expect(run.id, 'run_1');
      expect(run.status, 'completed');
      expect(run.isTerminal, isTrue);
    });

    test('RunRecord.isTerminal 对执行中为 false', () {
      final run = RunRecord.fromJson({
        'id': 'run_2',
        'task': 'x',
        'status': 'running',
        'createdAt': '2026-08-30T00:00:00.000Z',
      });
      expect(run.isTerminal, isFalse);
    });

    test('PendingApproval.fromJson', () {
      final approval = PendingApproval.fromJson({
        'id': 'appr_1',
        'runId': 'run_1',
        'toolName': 'shell_exec',
        'reason': 'requires approval',
      });
      expect(approval.toolName, 'shell_exec');
    });
  });
}
