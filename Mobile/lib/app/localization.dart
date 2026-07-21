import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

/// Lightweight in-app string catalog for English and Urdu.
class AppLocalizations {
  AppLocalizations(this.locale);

  final Locale locale;

  static const supportedLocales = [Locale('en'), Locale('ur')];

  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = [
    _AppLocalizationsDelegate(),
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const _values = {
    'en': {
      'appName': 'RankUp Education',
      'login': 'Login',
      'student': 'Student',
      'parent': 'Parent',
      'teacher': 'Teacher',
      'dashboard': 'Dashboard',
      'learn': 'Learn',
      'rankings': 'Rankings',
      'profile': 'Profile',
      'messages': 'Messages',
      'reports': 'Reports',
    },
    'ur': {
      'appName': 'RankUp Education',
      'login': 'Login',
      'student': 'Talib Ilm',
      'parent': 'Walidain',
      'teacher': 'Ustad',
      'dashboard': 'Dashboard',
      'learn': 'Seekhain',
      'rankings': 'Darja Bandi',
      'profile': 'Profile',
      'messages': 'Paighamat',
      'reports': 'Reports',
    },
  };

  /// Resolves a localized label, falling back to English then the raw key.
  String text(String key) {
    return _values[locale.languageCode]?[key] ?? _values['en']![key] ?? key;
  }
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return AppLocalizations.supportedLocales.any(
      (supported) => supported.languageCode == locale.languageCode,
    );
  }

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture(AppLocalizations(locale));
  }

  @override
  bool shouldReload(covariant LocalizationsDelegate<AppLocalizations> old) {
    return false;
  }
}
