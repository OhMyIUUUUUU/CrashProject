declare module 'barangay' {
  // Main function overloads
  function barangay(): string[]; // Returns array of region names
  function barangay(region: string): string[]; // Returns array of province names
  function barangay(region: string, province: string): string[]; // Returns array of city names
  function barangay(region: string, province: string, city: string): string[]; // Returns array of barangay names
  
  // Export the dump property
  namespace barangay {
    export const dump: any;
  }
  
  export = barangay;
}

