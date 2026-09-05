import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers.dart';

class RunsScreen extends ConsumerWidget {
  const RunsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final runs = ref.watch(runsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('ADui Forge'),
        actions: [
          IconButton(
            icon: const Icon(Icons.verified_user_outlined),
            tooltip: '审批',
            onPressed: () => context.push('/approvals'),
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: '设置',
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: runs.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('加载失败：$error', textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => ref.invalidate(runsProvider),
                child: const Text('重试'),
              ),
            ],
          ),
        ),
        data: (list) => RefreshIndicator(
          onRefresh: () async => ref.refresh(runsProvider.future),
          child: list.isEmpty
              ? const Center(child: Text('还没有 Run'))
              : ListView.builder(
                  itemCount: list.length,
                  itemBuilder: (context, index) {
                    final run = list[index];
                    return ListTile(
                      leading: _StatusChip(status: run.status),
                      title: Text(run.task, maxLines: 1, overflow: TextOverflow.ellipsis),
                      subtitle: Text(run.id, maxLines: 1, overflow: TextOverflow.ellipsis),
                      onTap: () => context.push('/runs/${run.id}'),
                    );
                  },
                ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'completed' => Colors.green,
      'failed' || 'timeout' => Colors.red,
      'running' => Colors.blue,
      'waiting_approval' => Colors.orange,
      _ => Colors.grey,
    };
    return Chip(
      label: Text(status, style: const TextStyle(fontSize: 11, color: Colors.white)),
      backgroundColor: color,
      visualDensity: VisualDensity.compact,
    );
  }
}
