import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/core/widgets/app_empty_state.dart';

class AsyncProductPage extends ConsumerWidget {
  const AsyncProductPage({
    required this.title,
    required this.asyncValue,
    required this.onRefresh,
    required this.icon,
    required this.emptyTitle,
    required this.emptyMessage,
    required this.isEmpty,
    required this.builder,
    super.key,
  });

  final String title;
  final AsyncValue<dynamic> asyncValue;
  final VoidCallback onRefresh;
  final IconData icon;
  final String emptyTitle;
  final String emptyMessage;
  final bool Function(dynamic data) isEmpty;
  final Widget Function(BuildContext context, dynamic data) builder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: asyncValue.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => AppEmptyState(
          icon: Icons.error_outline,
          title: 'Could not load $title',
          message: error is AppException ? error.message : error.toString(),
        ),
        data: (data) {
          if (isEmpty(data)) {
            return AppEmptyState(
              icon: icon,
              title: emptyTitle,
              message: emptyMessage,
            );
          }
          return builder(context, data);
        },
      ),
    );
  }
}
