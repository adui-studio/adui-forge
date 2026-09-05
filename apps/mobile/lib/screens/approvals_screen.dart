import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers.dart';

/// 审批屏：列出待审批操作，批准 / 拒绝一键决策（REQUIREMENTS §48 Mobile 审批）。
class ApprovalsScreen extends ConsumerWidget {
  const ApprovalsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final approvals = ref.watch(pendingApprovalsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('待审批')),
      body: approvals.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('加载失败：$error')),
        data: (list) => list.isEmpty
            ? const Center(child: Text('当前没有待审批操作'))
            : ListView.builder(
                itemCount: list.length,
                itemBuilder: (context, index) {
                  final item = list[index];
                  return Card(
                    margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.toolName,
                              style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 4),
                          Text(item.reason),
                          const SizedBox(height: 4),
                          Text('Run: ${item.runId}',
                              style: Theme.of(context).textTheme.bodySmall),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              FilledButton.tonal(
                                onPressed: () async {
                                  final client = ref.read(apiClientProvider);
                                  await client.decideApproval(item.id, false);
                                  ref.invalidate(pendingApprovalsProvider);
                                },
                                child: const Text('拒绝'),
                              ),
                              const SizedBox(width: 8),
                              FilledButton(
                                onPressed: () async {
                                  final client = ref.read(apiClientProvider);
                                  await client.decideApproval(item.id, true);
                                  ref.invalidate(pendingApprovalsProvider);
                                },
                                child: const Text('批准'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}
