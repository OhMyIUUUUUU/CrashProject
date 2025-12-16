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

  birthdate: (value: string): string | undefined => {
    if (!value) return 'Birthdate is required';
    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) return 'Please enter a valid date (YYYY-MM-DD)';
    
    // Validate the date is valid
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Please enter a valid date';
    
    // Validate the date is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) return 'Birthdate cannot be in the future';
    
    // Validate the person is at least 1 year old
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      const actualAge = age - 1;
      if (actualAge < 1) return 'You must be at least 1 year old';
    } else if (age < 1) {
      return 'You must be at least 1 year old';
    }
    
    // Validate the person is not too old (reasonable limit)
    if (age > 120) return 'Please enter a valid birthdate';
    
    return undefined;
  },
};

