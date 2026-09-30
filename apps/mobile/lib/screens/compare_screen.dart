import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';

/// 对比查看屏（只读）：列出对比批次 → 查看某批次各 Agent 的
/// 状态 / 耗时 / 输出。数据来自 /comparisons（结果由 Run 实时派生）。
class CompareScreen extends ConsumerStatefulWidget {
  const CompareScreen({super.key});

  @override
  ConsumerState<CompareScreen> createState() => _CompareScreenState();
}

class _CompareScreenState extends ConsumerState<CompareScreen> {
  Future<List<Map<String, dynamic>>>? _batchesFuture;

  /// 批次的 Agent 名单（用于列表副标题）。
  String _agentsOf(Map<String, dynamic> batch) {
    final items = (batch['items'] as List<dynamic>?) ?? const [];
    return items
        .map((item) => (item as Map<String, dynamic>)['agentName'])
        .join(', ');
  }

  @override
  void initState() {
    super.initState();
    _batchesFuture = ref.read(apiClientProvider).listComparisons();
  }

  Future<void> _reload() async {
    setState(() {
      _batchesFuture = ref.read(apiClientProvider).listComparisons();
    });
  }

  Future<void> _openDetail(String id) async {
    final detail = await ref.read(apiClientProvider).fetchComparison(id);
    if (!mounted) return;
    final record = detail['record'] as Map<String, dynamic>;
    final results = (detail['results'] as List<dynamic>? ?? const [])
        .map((item) => item as Map<String, dynamic>)
        .toList();
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _ComparisonDetailScreen(
          task: (record['task'] as String?) ?? '',
          results: results,
          onExport: (format) =>
              ref.read(apiClientProvider).exportComparison(id, format),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('对比查看')),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: FutureBuilder<List<Map<String, dynamic>>>(
          future: _batchesFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text('加载失败：${snapshot.error}'));
            }
            final batches = snapshot.data ?? const [];
            if (batches.isEmpty) {
              return Center(
                child: Text(
                  '还没有对比批次。\n在 Web 端「对比」页发起后可在此查看。',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.45)),
                ),
              );
            }
            return ListView(
              padding: const EdgeInsets.all(12),
              children: [
                for (final batch in batches)
                  Card(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    child: ListTile(
                      leading: const Icon(Icons.compare_arrows),
                      title: Text(
                        (batch['task'] as String?) ?? '',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: Text(
                        'Agents: ${_agentsOf(batch)}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      onTap: () => _openDetail(batch['id'] as String),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ComparisonDetailScreen extends StatelessWidget {
  const _ComparisonDetailScreen({
    required this.task,
    required this.results,
    required this.onExport,
  });

  final String task;
  final List<Map<String, dynamic>> results;

  /// 导出回调：传入格式（csv / md），返回报告文本（由父级请求 API 并复制到剪贴板）。
  final Future<String> Function(String format) onExport;

  Future<void> _export(BuildContext context, String format) async {
    final messenger = ScaffoldMessenger.of(context);
    final content = await onExport(format);
    await Clipboard.setData(ClipboardData(text: content));
    messenger.showSnackBar(
      SnackBar(
        content: Text(
            '${format == 'csv' ? 'CSV' : 'Markdown'} 报告已复制到剪贴板'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('对比详情'),
        actions: [
          PopupMenuButton<String>(
            tooltip: '导出报告',
            icon: const Icon(Icons.ios_share),
            onSelected: (format) => _export(context, format),
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'csv', child: Text('CSV 报告')),
              PopupMenuItem(value: 'md', child: Text('Markdown 报告')),
            ],
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(task, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),
          for (final result in results) ...[
            Card(
              margin: const EdgeInsets.symmetric(vertical: 6),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          (result['agentName'] as String?) ?? '',
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          (result['status'] as String?) ?? 'unknown',
                          style: TextStyle(
                            fontSize: 12,
                            color: result['status'] == 'completed'
                                ? const Color(0xFF6CFF00)
                                : result['status'] == 'failed'
                                    ? const Color(0xFFF87171)
                                    : Colors.white54,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          result['durationMs'] == null
                              ? '—'
                              : '${((result['durationMs'] as num) / 1000).toStringAsFixed(1)}s',
                          style: const TextStyle(
                              fontSize: 12, color: Colors.white54),
                        ),
                      ],
                    ),
                    if ((result['error'] as String?)?.isNotEmpty == true)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          '错误：${result['error']}',
                          style: const TextStyle(
                              color: Color(0xFFF87171), fontSize: 12),
                        ),
                      ),
                    if (((result['text'] as String?) ?? '').isNotEmpty) ...[
                      const SizedBox(height: 8),
                      SelectableText(
                        (result['text'] as String?) ?? '',
                        style: const TextStyle(height: 1.4, fontSize: 13),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
