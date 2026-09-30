import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api_client.dart';
import '../providers.dart';

/// Run 详情屏：状态、任务、模型输出与错误；非终态时自动轮询（3s），
/// 支持取消（非终态）与重试（终态）。
class RunDetailScreen extends ConsumerStatefulWidget {
  const RunDetailScreen({super.key, required this.runId});

  final String runId;

  @override
  ConsumerState<RunDetailScreen> createState() => _RunDetailScreenState();
}

class _RunDetailScreenState extends ConsumerState<RunDetailScreen> {
  Timer? _pollTimer;
  bool _acting = false;

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  /// 非终态时启动轮询；终态自动停止。
  void _ensurePolling(AsyncValue<RunRecord>? _, AsyncValue<RunRecord> next) {
    final record = next.value;
    if (record != null && !record.isTerminal) {
      _pollTimer ??= Timer.periodic(const Duration(seconds: 3), (_) {
        unawaited(ref.refresh(runDetailProvider(widget.runId).future));
      });
    } else {
      _pollTimer?.cancel();
      _pollTimer = null;
    }
  }

  Future<void> _cancel() async {
    setState(() => _acting = true);
    try {
      await ref.read(apiClientProvider).cancelRun(widget.runId);
      unawaited(ref.refresh(runDetailProvider(widget.runId).future));
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _retry() async {
    setState(() => _acting = true);
    try {
      final created = await ref.read(apiClientProvider).retryRun(widget.runId);
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/runs/${created.id}');
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final run = ref.watch(runDetailProvider(widget.runId));
    ref.listen(runDetailProvider(widget.runId), _ensurePolling);
    // _lastRecord 供 listen 回调在重建间隙使用；此处以 watch 结果为准
    return Scaffold(
      appBar: AppBar(title: const Text('Run 详情')),
      body: run.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('加载失败：$error')),
        data: (record) => RefreshIndicator(
          onRefresh: () async {
            unawaited(ref.refresh(runDetailProvider(widget.runId).future));
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(record.status,
                        style: Theme.of(context).textTheme.headlineSmall),
                  ),
                  if (!record.isTerminal)
                    TextButton(
                      onPressed: _acting ? null : _cancel,
                      child: const Text('取消'),
                    ),
                  if (record.isTerminal)
                    TextButton(
                      onPressed: _acting ? null : _retry,
                      child: const Text('重试（新建 Run）'),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(record.task),
              const SizedBox(height: 8),
              Text('创建于 ${record.createdAt}',
                  style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 16),
              if (record.isTerminal) ...[
                // 模型输出（model.delta 拼接）与错误
                if (record.output.isNotEmpty) ...[
                  Text('模型输出', style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 4),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: SelectableText(record.output,
                        style: const TextStyle(height: 1.4)),
                  ),
                  const SizedBox(height: 12),
                ],
                if (record.error != null)
                  Text('错误：${record.error}',
                      style: const TextStyle(color: Color(0xFFF87171))),
                if (record.error == null && record.output.isEmpty)
                  const Text('已结束（无文本输出）'),
              ] else ...[
                const Text('执行中，自动刷新中…'),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
