import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api_client.dart';
import '../providers.dart';

/// 审批屏：待审批一键决策（REQUIREMENTS §48）+ 决策审计历史（v1.2.1 审计留痕）。
class ApprovalsScreen extends ConsumerWidget {
  const ApprovalsScreen({super.key});

  String _timeOf(String iso) {
    if (iso.length < 16) return iso;
    return iso.substring(0, 16).replaceFirst('T', ' ');
  }

  Widget _sectionTitle(String text) => Padding(
    padding: const EdgeInsets.fromLTRB(4, 8, 4, 8),
    child: Text(
      text,
      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
    ),
  );

  Widget _loading() => const Padding(
    padding: EdgeInsets.all(24),
    child: Center(child: CircularProgressIndicator()),
  );

  Widget _error(Object error) =>
      Padding(padding: const EdgeInsets.all(8), child: Text('加载失败：$error'));

  Widget _pendingCard(
    BuildContext context,
    WidgetRef ref,
    PendingApproval item,
  ) => Card(
    margin: const EdgeInsets.symmetric(vertical: 6),
    child: Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(item.toolName, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(item.reason),
          const SizedBox(height: 4),
          Text(
            'Run: ${item.runId}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              FilledButton.tonal(
                onPressed: () async {
                  final client = ref.read(apiClientProvider);
                  await client.decideApproval(item.id, false);
                  ref.invalidate(pendingApprovalsProvider);
                  ref.invalidate(approvalHistoryProvider);
                },
                child: const Text('拒绝'),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: () async {
                  final client = ref.read(apiClientProvider);
                  await client.decideApproval(item.id, true);
                  ref.invalidate(pendingApprovalsProvider);
                  ref.invalidate(approvalHistoryProvider);
                },
                child: const Text('批准'),
              ),
            ],
          ),
        ],
      ),
    ),
  );

  Widget _historyCard(BuildContext context, ApprovalAuditEntry entry) => Card(
    margin: const EdgeInsets.symmetric(vertical: 4),
    child: ListTile(
      leading: Icon(
        entry.decision == 'approved' ? Icons.check_circle : Icons.cancel,
        color: entry.decision == 'approved'
            ? const Color(0xFF6CFF00)
            : const Color(0xFFF87171),
      ),
      title: Text(
        entry.toolName,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontSize: 14),
      ),
      subtitle: Text(
        entry.reason.isEmpty
            ? _timeOf(entry.decidedAt)
            : '${entry.reason} · ${_timeOf(entry.decidedAt)}',
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontSize: 12),
      ),
      onTap: () => context.push('/runs/${entry.runId}'),
    ),
  );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final approvals = ref.watch(pendingApprovalsProvider);
    final history = ref.watch(approvalHistoryProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('待审批')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(pendingApprovalsProvider);
          ref.invalidate(approvalHistoryProvider);
          await Future.wait([
            ref.read(pendingApprovalsProvider.future),
            ref.read(approvalHistoryProvider.future),
          ]);
        },
        child: ListView(
          padding: const EdgeInsets.all(12),
          children: [
            _sectionTitle('待审批'),
            approvals.when(
              loading: _loading,
              error: (error, _) => _error(error),
              data: (list) => list.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(8),
                      child: Text(
                        '当前没有待审批操作',
                        style: TextStyle(color: Colors.white54, fontSize: 13),
                      ),
                    )
                  : Column(
                      children: [
                        for (final item in list)
                          _pendingCard(context, ref, item),
                      ],
                    ),
            ),
            const SizedBox(height: 12),
            _sectionTitle('审批历史'),
            history.when(
              loading: _loading,
              error: (error, _) => _error(error),
              data: (list) => list.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(8),
                      child: Text(
                        '暂无决策记录',
                        style: TextStyle(color: Colors.white54, fontSize: 13),
                      ),
                    )
                  : Column(
                      children: [
                        for (final entry in list.take(20))
                          _historyCard(context, entry),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
