# 📱 دليل دمج Flutter مع Auth API

## 🎯 نظرة عامة

هذا الدليل يساعدك في دمج Flutter app مع Auth API الخاص بالسيرفر.

---

## 1️⃣ الـ Base URL

```dart
class ApiConfig {
  static const String baseUrl = 'https://your-app.railway.app/api/v1';
  
  // Endpoints
  static const String register = '$baseUrl/auth/register';
  static const String login = '$baseUrl/auth/login';
  static const String refresh = '$baseUrl/auth/refresh';
  static const String logout = '$baseUrl/auth/logout';
}
```

---

## 2️⃣ الـ Models

### User Role Enum
```dart
enum UserRole {
  PLAYER,
  FIELD_OWNER,
  ADMIN;

  // Convert to string for API
  String toJson() => name;

  // Parse from API response
  static UserRole fromJson(String value) {
    return UserRole.values.firstWhere(
      (role) => role.name == value,
      orElse: () => UserRole.PLAYER,
    );
  }
}
```

### Register Request Model
```dart
class RegisterRequest {
  final String email;
  final String password;
  final UserRole? role;

  RegisterRequest({
    required this.email,
    required this.password,
    this.role,
  });

  Map<String, dynamic> toJson() {
    final json = {
      'email': email,
      'password': password,
    };
    
    if (role != null) {
      json['role'] = role!.toJson();
    }
    
    return json;
  }
}
```

### Login Request Model
```dart
class LoginRequest {
  final String email;
  final String password;

  LoginRequest({
    required this.email,
    required this.password,
  });

  Map<String, dynamic> toJson() => {
    'email': email,
    'password': password,
  };
}
```

### Auth Response Model
```dart
class AuthResponse {
  final bool success;
  final AuthData data;
  final String message;

  AuthResponse({
    required this.success,
    required this.data,
    required this.message,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      success: json['success'] ?? false,
      data: AuthData.fromJson(json['data']),
      message: json['message'] ?? '',
    );
  }
}

class AuthData {
  final User user;
  final Tokens tokens;

  AuthData({
    required this.user,
    required this.tokens,
  });

  factory AuthData.fromJson(Map<String, dynamic> json) {
    return AuthData(
      user: User.fromJson(json['user']),
      tokens: Tokens.fromJson(json['tokens']),
    );
  }
}

class User {
  final String id;
  final String email;
  final UserRole role;
  final bool isVerified;

  User({
    required this.id,
    required this.email,
    required this.role,
    required this.isVerified,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      role: UserRole.fromJson(json['role']),
      isVerified: json['isVerified'] ?? false,
    );
  }
}

class Tokens {
  final String accessToken;
  final String refreshToken;

  Tokens({
    required this.accessToken,
    required this.refreshToken,
  });

  factory Tokens.fromJson(Map<String, dynamic> json) {
    return Tokens(
      accessToken: json['accessToken'],
      refreshToken: json['refreshToken'],
    );
  }
}
```

### Error Response Model
```dart
class ErrorResponse {
  final bool success;
  final ErrorData error;
  final String timestamp;

  ErrorResponse({
    required this.success,
    required this.error,
    required this.timestamp,
  });

  factory ErrorResponse.fromJson(Map<String, dynamic> json) {
    return ErrorResponse(
      success: json['success'] ?? false,
      error: ErrorData.fromJson(json['error']),
      timestamp: json['timestamp'] ?? '',
    );
  }
}

class ErrorData {
  final String code;
  final BilingualMessage message;
  final List<ValidationError>? details;

  ErrorData({
    required this.code,
    required this.message,
    this.details,
  });

  factory ErrorData.fromJson(Map<String, dynamic> json) {
    return ErrorData(
      code: json['code'],
      message: BilingualMessage.fromJson(json['message']),
      details: json['details'] != null
          ? (json['details'] as List)
              .map((e) => ValidationError.fromJson(e))
              .toList()
          : null,
    );
  }
}

class BilingualMessage {
  final String en;
  final String ar;

  BilingualMessage({
    required this.en,
    required this.ar,
  });

  factory BilingualMessage.fromJson(dynamic json) {
    if (json is String) {
      return BilingualMessage(en: json, ar: json);
    }
    return BilingualMessage(
      en: json['en'] ?? '',
      ar: json['ar'] ?? '',
    );
  }

  String get(String locale) {
    return locale == 'ar' ? ar : en;
  }
}

class ValidationError {
  final String field;
  final BilingualMessage message;

  ValidationError({
    required this.field,
    required this.message,
  });

  factory ValidationError.fromJson(Map<String, dynamic> json) {
    return ValidationError(
      field: json['field'],
      message: BilingualMessage.fromJson(json['message']),
    );
  }
}
```

---

## 3️⃣ الـ Auth Service

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class AuthService {
  final String baseUrl = ApiConfig.baseUrl;

  // Register
  Future<AuthResponse> register({
    required String email,
    required String password,
    UserRole? role,
  }) async {
    try {
      final request = RegisterRequest(
        email: email,
        password: password,
        role: role,
      );

      final response = await http.post(
        Uri.parse('$baseUrl/auth/register'),
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'en', // or 'ar' for Arabic
        },
        body: jsonEncode(request.toJson()),
      );

      if (response.statusCode == 201) {
        return AuthResponse.fromJson(jsonDecode(response.body));
      } else {
        final error = ErrorResponse.fromJson(jsonDecode(response.body));
        throw AuthException(
          code: error.error.code,
          message: error.error.message.en,
          details: error.error.details,
        );
      }
    } catch (e) {
      if (e is AuthException) rethrow;
      throw AuthException(
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to server: $e',
      );
    }
  }

  // Login
  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    try {
      final request = LoginRequest(
        email: email,
        password: password,
      );

      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'en', // or 'ar' for Arabic
        },
        body: jsonEncode(request.toJson()),
      );

      if (response.statusCode == 200) {
        return AuthResponse.fromJson(jsonDecode(response.body));
      } else {
        final error = ErrorResponse.fromJson(jsonDecode(response.body));
        throw AuthException(
          code: error.error.code,
          message: error.error.message.en,
          details: error.error.details,
        );
      }
    } catch (e) {
      if (e is AuthException) rethrow;
      throw AuthException(
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to server: $e',
      );
    }
  }

  // Refresh Token
  Future<Tokens> refreshToken(String refreshToken) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'en',
        },
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        return Tokens.fromJson(json['data']['tokens']);
      } else {
        throw AuthException(
          code: 'REFRESH_FAILED',
          message: 'Failed to refresh token',
        );
      }
    } catch (e) {
      if (e is AuthException) rethrow;
      throw AuthException(
        code: 'NETWORK_ERROR',
        message: 'Failed to refresh token: $e',
      );
    }
  }

  // Logout
  Future<void> logout(String accessToken) async {
    try {
      await http.post(
        Uri.parse('$baseUrl/auth/logout'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
          'Accept-Language': 'en',
        },
      );
    } catch (e) {
      // Ignore logout errors
      print('Logout error: $e');
    }
  }
}

// Custom Exception
class AuthException implements Exception {
  final String code;
  final String message;
  final List<ValidationError>? details;

  AuthException({
    required this.code,
    required this.message,
    this.details,
  });

  @override
  String toString() => message;
}
```

---

## 4️⃣ استخدام الـ Service

### مثال: التسجيل
```dart
final authService = AuthService();

try {
  final response = await authService.register(
    email: 'player@example.com',
    password: 'Password123!',
    role: UserRole.PLAYER,
  );

  // Save tokens
  await saveTokens(
    accessToken: response.data.tokens.accessToken,
    refreshToken: response.data.tokens.refreshToken,
  );

  // Navigate to home
  Navigator.pushReplacementNamed(context, '/home');
} on AuthException catch (e) {
  // Handle specific errors
  if (e.code == 'EMAIL_ALREADY_EXISTS') {
    showError('This email is already registered');
  } else if (e.code == 'VALIDATION_ERROR') {
    showValidationErrors(e.details);
  } else {
    showError(e.message);
  }
} catch (e) {
  showError('An unexpected error occurred');
}
```

### مثال: الدخول
```dart
try {
  final response = await authService.login(
    email: 'player@example.com',
    password: 'Password123!',
  );

  // Save tokens
  await saveTokens(
    accessToken: response.data.tokens.accessToken,
    refreshToken: response.data.tokens.refreshToken,
  );

  // Navigate to home
  Navigator.pushReplacementNamed(context, '/home');
} on AuthException catch (e) {
  if (e.code == 'INVALID_CREDENTIALS') {
    showError('Invalid email or password');
  } else {
    showError(e.message);
  }
}
```

---

## 5️⃣ Password Validation

```dart
class PasswordValidator {
  static const int minLength = 8;
  
  static String? validate(String? password) {
    if (password == null || password.isEmpty) {
      return 'Password is required';
    }
    
    if (password.length < minLength) {
      return 'Password must be at least $minLength characters';
    }
    
    if (!password.contains(RegExp(r'[A-Z]'))) {
      return 'Password must contain at least one uppercase letter';
    }
    
    if (!password.contains(RegExp(r'[a-z]'))) {
      return 'Password must contain at least one lowercase letter';
    }
    
    if (!password.contains(RegExp(r'[0-9]'))) {
      return 'Password must contain at least one number';
    }
    
    if (!password.contains(RegExp(r'[@$!%*?&]'))) {
      return 'Password must contain at least one special character (@$!%*?&)';
    }
    
    return null;
  }
  
  static bool isValid(String password) {
    return validate(password) == null;
  }
}
```

---

## 6️⃣ Token Storage

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const _storage = FlutterSecureStorage();
  
  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  
  // Save tokens
  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }
  
  // Get access token
  static Future<String?> getAccessToken() async {
    return await _storage.read(key: _accessTokenKey);
  }
  
  // Get refresh token
  static Future<String?> getRefreshToken() async {
    return await _storage.read(key: _refreshTokenKey);
  }
  
  // Clear tokens
  static Future<void> clearTokens() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }
}
```

---

## 7️⃣ HTTP Interceptor (للـ Auto Refresh)

```dart
import 'package:http/http.dart' as http;

class AuthenticatedHttpClient extends http.BaseClient {
  final http.Client _inner = http.Client();
  final AuthService _authService = AuthService();

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    // Add access token to request
    final accessToken = await TokenStorage.getAccessToken();
    if (accessToken != null) {
      request.headers['Authorization'] = 'Bearer $accessToken';
    }

    // Send request
    var response = await _inner.send(request);

    // If 401, try to refresh token
    if (response.statusCode == 401) {
      final refreshToken = await TokenStorage.getRefreshToken();
      if (refreshToken != null) {
        try {
          // Refresh token
          final tokens = await _authService.refreshToken(refreshToken);
          
          // Save new tokens
          await TokenStorage.saveTokens(
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          );

          // Retry original request with new token
          request.headers['Authorization'] = 'Bearer ${tokens.accessToken}';
          response = await _inner.send(request);
        } catch (e) {
          // Refresh failed, logout user
          await TokenStorage.clearTokens();
          // Navigate to login
        }
      }
    }

    return response;
  }
}
```

---

## 8️⃣ الأخطاء الشائعة وحلولها

### ❌ "Invalid role"
```dart
// خطأ
role: UserRole.player  // lowercase

// صحيح
role: UserRole.PLAYER  // uppercase
```

### ❌ "Password validation failed"
```dart
// خطأ
password: "pass123"  // لا يحتوي على حرف كبير أو رمز خاص

// صحيح
password: "Password123!"  // يحتوي على كل المتطلبات
```

### ❌ "Email already exists"
```dart
// الحل: استخدم login بدلاً من register
try {
  await authService.register(...);
} on AuthException catch (e) {
  if (e.code == 'EMAIL_ALREADY_EXISTS') {
    // Suggest login instead
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Account Exists'),
        content: Text('An account with this email already exists. Would you like to login instead?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pushNamed(context, '/login'),
            child: Text('Login'),
          ),
        ],
      ),
    );
  }
}
```

---

## 9️⃣ Testing

### Unit Test Example
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

void main() {
  group('AuthService', () {
    test('register with valid data should succeed', () async {
      final authService = AuthService();
      
      final response = await authService.register(
        email: 'test@example.com',
        password: 'Password123!',
        role: UserRole.PLAYER,
      );
      
      expect(response.success, true);
      expect(response.data.user.email, 'test@example.com');
      expect(response.data.tokens.accessToken, isNotEmpty);
    });
    
    test('register with invalid password should fail', () async {
      final authService = AuthService();
      
      expect(
        () => authService.register(
          email: 'test@example.com',
          password: 'weak',
          role: UserRole.PLAYER,
        ),
        throwsA(isA<AuthException>()),
      );
    });
  });
}
```

---

## 🔟 Dependencies

أضف هذه الـ dependencies في `pubspec.yaml`:

```yaml
dependencies:
  http: ^1.1.0
  flutter_secure_storage: ^9.0.0
  
dev_dependencies:
  mockito: ^5.4.0
  build_runner: ^2.4.0
```

---

## 📚 مصادر إضافية

- [AUTH_DEBUGGING_GUIDE.md](./AUTH_DEBUGGING_GUIDE.md) - دليل التشخيص
- [TEST_SCRIPTS_README.md](./TEST_SCRIPTS_README.md) - دليل السكريبتات
- Swagger Docs: `https://your-app.railway.app/api/docs`

---

## 💡 نصائح

1. **استخدم flutter_secure_storage للـ tokens**
2. **تعامل مع الأخطاء بشكل صحيح**
3. **اختبر على أجهزة حقيقية**
4. **استخدم HTTP interceptor للـ auto refresh**
5. **احفظ الـ user data محليًا**
