import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

class AppLocalizations {
  AppLocalizations(this.locale);

  final Locale locale;

  static const supportedLocales = [Locale('en'), Locale('ur')];

  static const localizationsDelegates = [
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
      'appName': 'رینک اپ ایجوکیشن',
      'login': 'لاگ ان',
      'student': 'طالب علم',
      'parent': 'والدین',
      'teacher': 'استاد',
      'dashboard': 'ڈیش بورڈ',
      'learn': 'سیکھیں',
      'rankings': 'درجہ بندی',
      'profile': 'پروفائل',
      'messages': 'پیغامات',
      'reports': 'رپورٹس',
    },
  };

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
