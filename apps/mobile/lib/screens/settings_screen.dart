import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../providers.dart';

/// 设置屏：API 地址配置（持久化到安全存储）与登录入口。
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _controller = TextEditingController();
  static const _storage = FlutterSecureStorage();
  static const _baseUrlKey = 'forge.baseUrl';

  @override
  void initState() {
    super.initState();
    _storage.read(key: _baseUrlKey).then((saved) {
      if (saved != null && saved.isNotEmpty && mounted) {
        _controller.text = saved;
        ref.read(baseUrlProvider.notifier).set(saved);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final value = _controller.text.trim();
    if (value.isEmpty) return;
    ref.read(baseUrlProvider.notifier).set(value);
    await _storage.write(key: _baseUrlKey, value: value);
    ref.invalidate(runsProvider);
    ref.invalidate(pendingApprovalsProvider);
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('已保存：$value')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('设置')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _controller,
            decoration: const InputDecoration(
              labelText: 'API 地址',
              hintText: 'http://10.0.2.2:3000',
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(onPressed: _save, child: const Text('保存')),
          const SizedBox(height: 24),
          FilledButton.tonal(
            onPressed: () => context.push('/login'),
            child: const Text('登录 / 注册'),
          ),
        ],
      ),
    );
  }
}
