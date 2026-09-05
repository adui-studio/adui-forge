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
      theme: _forgeTheme(),
      routerConfig: router,
    );
  }
}


/// 沉浸式品牌主题：深空底 + logo 电光绿/深紫双色系（与 Web 端一致）。
ThemeData _forgeTheme() {
  const surface = Color(0xFF060609);
  const brand = Color(0xFF6CFF00);
  const accent = Color(0xFFB79AEC);
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: surface,
    colorScheme: ColorScheme.dark(
      primary: brand,
      onPrimary: Colors.black,
      secondary: accent,
      onSecondary: Colors.black,
      surface: surface,
      onSurface: const Color(0xFFE2E8F0),
      error: const Color(0xFFF87171),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
    ),
    cardTheme: CardThemeData(
      color: Colors.white.withValues(alpha: 0.04),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: brand,
        foregroundColor: Colors.black,
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    dividerTheme: DividerThemeData(color: Colors.white.withValues(alpha: 0.08)),
  );
}
