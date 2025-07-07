/**
 * Shared validation utilities for form fields
 */

export interface ValidationErrors {
  music_id: string;
  title: string;
}

export interface ExtendedValidationErrors extends ValidationErrors {
  email: string;
  password: string;
  mylistTitle: string;
  count: string;
}

/**
 * Validate a single field based on field name and value
 */
export function validateField(field: string, value: string | number): string {
  switch (field) {
    case "music_id":
      if (!value || String(value).trim() === "") {
        return "IDは必須です";
      }
      break;
    case "title":
      if (!value || String(value).trim() === "") {
        return "タイトルは必須です";
      }
      break;
    case "email":
      if (!value || String(value).trim() === "") {
        return "メールアドレスは必須です";
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        return "有効なメールアドレスを入力してください";
      }
      break;
    case "password":
      if (!value || String(value).trim() === "") {
        return "パスワードは必須です";
      }
      break;
    case "mylistTitle":
      if (!value || String(value).trim() === "") {
        return "マイリスト名は必須です";
      }
      break;
    case "count":
      const num = Number(value);
      if (!value || isNaN(num)) {
        return "カウントは必須です";
      }
      // Note: max count validation needs to be handled separately as it's context-dependent
      if (num < 1) {
        return "カウントは1以上である必要があります";
      }
      break;
  }
  return "";
}

/**
 * Validate basic music form (music_id and title)
 */
export function validateMusicForm(musicId: string, title: string): ValidationErrors {
  return {
    music_id: validateField("music_id", musicId),
    title: validateField("title", title),
  };
}

/**
 * Check if validation errors object has any errors
 */
export function hasValidationErrors(errors: ValidationErrors | ExtendedValidationErrors | Record<string, string>): boolean {
  return Object.values(errors).some(error => error !== "");
}