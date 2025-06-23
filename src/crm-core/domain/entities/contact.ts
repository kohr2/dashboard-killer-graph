// Contact Entity - CRM Core Domain
// This class represents a contact in the CRM system

// Simple UUID generator for testing purposes
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface ContactData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
}

export class Contact {
  private id: string;
  private name: string;
  private email: string;
  private phone?: string;
  private createdAt: Date;
  private updatedAt: Date;
  
  constructor(data: ContactData) {
    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Name is required');
    }
    
    if (!data.email) {
      throw new Error('Email is required');
    }
    
    // Validate email format
    this.validateEmail(data.email);
    
    // Validate phone format if provided
    if (data.phone) {
      this.validatePhone(data.phone);
    }
    
    // Set properties
    this.id = data.id || generateUUID();
    this.name = data.name.trim();
    this.email = data.email.toLowerCase().trim();
    this.phone = data.phone;
    
    // Set timestamps
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }
  
  getId(): string {
    return this.id;
  }
  
  getName(): string {
    return this.name;
  }
  
  getEmail(): string {
    return this.email;
  }
  
  getPhone(): string | undefined {
    return this.phone;
  }
  
  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Name is required');
    }
    
    this.name = name.trim();
    this.updatedAt = new Date();
  }
  
  updateEmail(email: string): void {
    this.validateEmail(email);
    this.email = email.toLowerCase().trim();
    this.updatedAt = new Date();
  }
  
  updatePhone(phone: string): void {
    this.validatePhone(phone);
    this.phone = phone;
    this.updatedAt = new Date();
  }
  
  getCreatedAt(): Date {
    return this.createdAt;
  }
  
  getUpdatedAt(): Date {
    return this.updatedAt;
  }
  
  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }
  
  private validatePhone(phone: string): void {
    // Simple phone validation - expects format like +1-555-123-4567
    const phoneRegex = /^\+?\d{1,3}-?\d{3}-?\d{3}-?\d{4}$/;
    if (!phoneRegex.test(phone)) {
      throw new Error('Invalid phone format');
    }
  }
} 