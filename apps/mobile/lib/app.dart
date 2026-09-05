import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'screens/approvals_screen.dart';
import 'screens/login_screen.dart';
import 'screens/run_detail_screen.dart';
import 'screens/runs_screen.dart';
import 'screens/settings_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/runs',
    routes: [
      GoRoute(
        path: '/runs',
        builder: (context, state) => const RunsScreen(),
      ),
      GoRoute(
        path: '/runs/:id',
        builder: (context, state) =>
            RunDetailScreen(runId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/approvals',
        builder: (context, state) => const ApprovalsScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
  );
});

class ForgeApp extends ConsumerWidget {
  const ForgeApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'ADui Forge',
      theme: ThemeData(colorSchemeSeed: const Color(0xFF1464DC), useMaterial3: true),
      routerConfig: router,
    );
  }
}
