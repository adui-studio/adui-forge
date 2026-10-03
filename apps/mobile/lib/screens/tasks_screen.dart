import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers.dart';

/// 任务台账屏（只读，移动端"查看"域）：列出任务（标题/状态/时间），
/// 点开跳转派生 Run 的详情。创建任务在 Web 端完成。
class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> {
  Future<List<Map<String, dynamic>>>? _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    setState(() {
      _future = ref.read(apiClientProvider).fetchTasks();
    });
  }

  Color _statusColor(String status) {
    if (status == 'completed') return const Color(0xFF6CFF00);
    if (status == 'failed') return const Color(0xFFF87171);
    return Colors.white54;
  }

  String _createdAtOf(Map<String, dynamic> task) {
    final raw = (task['createdAt'] as String?) ?? '';
    if (raw.length < 16) return raw;
    return raw.substring(0, 16).replaceFirst('T', ' ');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('任务')),
      body: RefreshIndicator(
        onRefresh: () async => _reload(),
        child: FutureBuilder<List<Map<String, dynamic>>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text('加载失败：${snapshot.error}'));
            }
            final tasks = snapshot.data ?? const [];
            if (tasks.isEmpty) {
              return Center(
                child: Text(
                  '还没有任务。\n在 Web 端「控制台」或「任务」页发起。',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.45)),
                ),
              );
            }
            return ListView(
              padding: const EdgeInsets.all(12),
              children: [
                for (final task in tasks)
                  Card(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    child: ListTile(
                      title: Text(
                        (task['title'] as String?) ?? '',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 14),
                      ),
                      subtitle: Text(
                        '${_createdAtOf(task)} · 点按查看 Run',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.white54,
                        ),
                      ),
                      trailing: Text(
                        (task['status'] as String?) ?? 'unknown',
                        style: TextStyle(
                          fontSize: 12,
                          color: _statusColor(
                            (task['status'] as String?) ?? '',
                          ),
                        ),
                      ),
                      onTap: () => context.push('/runs/${task['runId']}'),
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
