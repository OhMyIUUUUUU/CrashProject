export const ValidationRules = {
  email: (value: string): string | undefined => {
    if (!value) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email';
    return undefined;
  },

  phone: (value: string): string | undefined => {
    if (!value) return 'Phone number is required';
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(value)) return 'Please enter a valid phone number (10-11 digits)';
    return undefined;
  },

  password: (value: string): string | undefined => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return undefined;
  },

  confirmPassword: (password: string, confirmPassword: string): string | undefined => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';
    return undefined;
  },

  required: (value: string, fieldName: string): string | undefined => {
    if (!value || value.trim() === '') return `${fieldName} is required`;
    return undefined;
  },

  age: (value: string): string | undefined => {
    if (!value) return 'Age is required';
    const age = parseInt(value, 10);
    if (isNaN(age) || age < 1 || age > 120) return 'Please enter a valid age';
    return undefined;
  },
};

