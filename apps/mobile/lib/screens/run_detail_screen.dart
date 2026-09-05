import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers.dart';

/// Run 详情屏：状态、任务与执行摘要；非终态时下拉刷新查看进度。
class RunDetailScreen extends ConsumerWidget {
  const RunDetailScreen({super.key, required this.runId});

  final String runId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final run = ref.watch(runDetailProvider(runId));
    return Scaffold(
      appBar: AppBar(title: const Text('Run 详情')),
      body: run.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('加载失败：$error')),
        data: (record) => RefreshIndicator(
          onRefresh: () async => ref.refresh(runDetailProvider(runId).future),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(record.status,
                  style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(record.task),
              const SizedBox(height: 8),
              Text('创建于 ${record.createdAt}',
                  style: Theme.of(context).textTheme.bodySmall),
              if (record.isTerminal) ...[
                const SizedBox(height: 16),
                Text('已结束', style: Theme.of(context).textTheme.bodyMedium),
              ] else ...[
                const SizedBox(height: 16),
                const Text('执行中，下拉刷新查看进度…'),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
