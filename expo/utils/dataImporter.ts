import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';

export interface ImportRecord {
  name: string;
  phone: string;
  email: string;
  emergencyContact: string;
  waiverSigned: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

export class DataImporter {
  private static readonly BATCH_SIZE = 100;
  private static readonly STORAGE_KEY = 'imported_users';

  static async importUsers(records: ImportRecord[]): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
    };

    try {
      console.log(`Starting import of ${records.length} records...`);
      
      // Load existing users
      const existingUsersData = await AsyncStorage.getItem('users_database');
      const existingUsers: User[] = existingUsersData ? JSON.parse(existingUsersData) : [];
      const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

      const newUsers: User[] = [];
      
      // Process records in batches
      for (let i = 0; i < records.length; i += this.BATCH_SIZE) {
        const batch = records.slice(i, i + this.BATCH_SIZE);
        
        for (const record of batch) {
          try {
            // Validate record
            const validation = this.validateRecord(record);
            if (!validation.valid) {
              result.failed++;
              result.errors.push(`Row ${i + batch.indexOf(record) + 1}: ${validation.error}`);
              continue;
            }

            // Check for duplicates
            if (existingEmails.has(record.email.toLowerCase())) {
              result.failed++;
              result.errors.push(`Row ${i + batch.indexOf(record) + 1}: Email ${record.email} already exists`);
              continue;
            }

            // Create user object
            const user: User = {
              id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              email: record.email.toLowerCase().trim(),
              name: record.name.trim(),
              phone: record.phone.trim(),
              emergencyContact: record.emergencyContact.trim(),
              waiverSigned: record.waiverSigned,
              passType: 'none',
              credits: 0,
              membershipTier: 'basic',
              totalAttendance: 0,
              marketingOptIn: true,
              createdAt: new Date().toISOString(),
            };

            newUsers.push(user);
            existingEmails.add(user.email);
            result.imported++;

          } catch (error) {
            result.failed++;
            result.errors.push(`Row ${i + batch.indexOf(record) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Save progress every batch
        if (newUsers.length > 0) {
          const allUsers = [...existingUsers, ...newUsers];
          await AsyncStorage.setItem('users_database', JSON.stringify(allUsers));
          console.log(`Imported batch: ${newUsers.length} users (Total: ${result.imported})`);
        }
      }

      result.success = result.imported > 0;
      console.log(`Import completed: ${result.imported} imported, ${result.failed} failed`);
      
      return result;

    } catch (error) {
      console.error('Import failed:', error);
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  static validateRecord(record: ImportRecord): { valid: boolean; error?: string } {
    // Check required fields
    if (!record.name || record.name.trim().length === 0) {
      return { valid: false, error: 'Name is required' };
    }

    if (!record.email || record.email.trim().length === 0) {
      return { valid: false, error: 'Email is required' };
    }

    if (!record.phone || record.phone.trim().length === 0) {
      return { valid: false, error: 'Phone is required' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(record.email.trim())) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    if (!phoneRegex.test(record.phone.trim())) {
      return { valid: false, error: 'Invalid phone format' };
    }

    // Validate name length
    if (record.name.trim().length < 2) {
      return { valid: false, error: 'Name must be at least 2 characters' };
    }

    return { valid: true };
  }

  static async exportUsers(): Promise<User[]> {
    try {
      const usersData = await AsyncStorage.getItem('users_database');
      return usersData ? JSON.parse(usersData) : [];
    } catch (error) {
      console.error('Export failed:', error);
      return [];
    }
  }

  static async getUserStats(): Promise<{
    total: number;
    withPasses: number;
    vipMembers: number;
    recentSignups: number;
  }> {
    try {
      const users = await this.exportUsers();
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      return {
        total: users.length,
        withPasses: users.filter(u => u.credits > 0 || (u.unlimitedUntil && new Date(u.unlimitedUntil) > now)).length,
        vipMembers: users.filter(u => u.membershipTier === 'vip').length,
        recentSignups: users.filter(u => new Date(u.createdAt) > thirtyDaysAgo).length,
      };
    } catch (error) {
      console.error('Stats calculation failed:', error);
      return { total: 0, withPasses: 0, vipMembers: 0, recentSignups: 0 };
    }
  }

  // Helper method to parse CSV data
  static parseCSV(csvText: string): ImportRecord[] {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Expected headers: name, phone, email, emergency_contact, waiver_signed
    const nameIndex = headers.findIndex(h => h.includes('name'));
    const phoneIndex = headers.findIndex(h => h.includes('phone'));
    const emailIndex = headers.findIndex(h => h.includes('email'));
    const emergencyIndex = headers.findIndex(h => h.includes('emergency'));
    const waiverIndex = headers.findIndex(h => h.includes('waiver'));

    if (nameIndex === -1 || phoneIndex === -1 || emailIndex === -1) {
      throw new Error('CSV must contain name, phone, and email columns');
    }

    const records: ImportRecord[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^\"(.*)\"$/, '$1'));
      
      if (values.length < 3) continue; // Skip incomplete rows
      
      records.push({
        name: values[nameIndex] || '',
        phone: values[phoneIndex] || '',
        email: values[emailIndex] || '',
        emergencyContact: emergencyIndex !== -1 ? values[emergencyIndex] || '' : '',
        waiverSigned: waiverIndex !== -1 ? 
          ['true', 'yes', '1', 'signed'].includes(values[waiverIndex]?.toLowerCase() || '') : false,
      });
    }

    return records;
  }

  // Generate sample data for testing
  static generateSampleData(count: number = 100): ImportRecord[] {
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa', 'Tom', 'Anna'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
    
    const records: ImportRecord[] = [];
    
    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      
      records.push({
        name: `${firstName} ${lastName}`,
        phone: `+61 4${Math.floor(Math.random() * 90000000 + 10000000)}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domain}`,
        emergencyContact: `+61 4${Math.floor(Math.random() * 90000000 + 10000000)}`,
        waiverSigned: Math.random() > 0.2, // 80% have signed waivers
      });
    }
    
    return records;
  }
}