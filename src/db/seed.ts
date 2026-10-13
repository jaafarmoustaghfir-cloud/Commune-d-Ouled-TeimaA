import { db } from './index.ts';
import { users, birthRecords, announcements, settings } from './schema.ts';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  try {
    console.log('Checking database seed state...');

    // Hash passwords using bcryptjs
    const employeePasswordHash = await bcrypt.hash('7845', 10);
    const adminPasswordHash = await bcrypt.hash('admin123', 10);

    // 1. Seed employees and admin individually if they don't exist
    const existingUsers = await db.select().from(users);
    const userEmails = new Set(existingUsers.map(u => u.email?.toLowerCase()));

    const usersToInsert = [];
    if (!userEmails.has('manal@ouledteima.ma')) {
      usersToInsert.push({
        email: 'manal@ouledteima.ma',
        password: employeePasswordHash,
        role: 'employee',
        name: 'MANAL',
        cin: 'JC111111',
        phone: '0612345678',
        address: 'Bureau de l\'Etat Civil, Commune d\'Ouled Teima',
        verifiedStatus: 'approved',
        forcePasswordChange: false,
        uid: 'employee-manal',
      });
    }
    if (!userEmails.has('fati@ouledteima.ma')) {
      usersToInsert.push({
        email: 'fati@ouledteima.ma',
        password: employeePasswordHash,
        role: 'employee',
        name: 'FATI',
        cin: 'JC222222',
        phone: '0612345679',
        address: 'Bureau de l\'Etat Civil, Commune d\'Ouled Teima',
        verifiedStatus: 'approved',
        forcePasswordChange: false,
        uid: 'employee-fati',
      });
    }
    if (!userEmails.has('admin@ouledteima.ma')) {
      usersToInsert.push({
        email: 'admin@ouledteima.ma',
        password: adminPasswordHash,
        role: 'admin',
        name: 'Super Admin Teima',
        cin: 'JC000000',
        phone: '0528526000',
        address: 'Hôtel de Ville, Commune d\'Ouled Teima',
        verifiedStatus: 'approved',
        forcePasswordChange: false,
        uid: 'admin-teima',
      });
    }

    if (usersToInsert.length > 0) {
      console.log(`Inserting ${usersToInsert.length} missing user account(s)...`);
      await db.insert(users).values(usersToInsert);
    }

    // Force existing seeded employees to have forcePasswordChange = false
    await db.update(users)
      .set({ forcePasswordChange: false })
      .where(or(
        eq(users.email, 'manal@ouledteima.ma'),
        eq(users.email, 'fati@ouledteima.ma')
      ));

    // 2. Seed official birth records registry individually if not exists
    const existingBirths = await db.select().from(birthRecords);
    const birthRecordKeys = new Set(existingBirths.map(b => `${b.recordNumber}-${b.recordYear}`));

    const birthsToInsert = [];
    const defaultBirths = [
      {
        recordNumber: '234',
        recordYear: '1978',
        nameAr: 'أحمد العلوي',
        nameFr: 'Ahmed Alaoui',
        fatherNameAr: 'محمد العلوي',
        fatherNameFr: 'Mohamed Alaoui',
        motherNameAr: 'فاطمة الزهراء',
        motherNameFr: 'Fatima Zahra',
        dateOfBirth: '1978-05-15',
        placeOfBirth: 'Ouled Teima',
        gender: 'M',
      },
      {
        recordNumber: '123',
        recordYear: '2000',
        nameAr: 'مريم الناصري',
        nameFr: 'Meryem Naciri',
        fatherNameAr: 'علي الناصري',
        fatherNameFr: 'Ali Naciri',
        motherNameAr: 'عائشة العلمي',
        motherNameFr: 'Aicha Alami',
        dateOfBirth: '2000-10-22',
        placeOfBirth: 'Ouled Teima',
        gender: 'F',
      },
      {
        recordNumber: '456',
        recordYear: '1995',
        nameAr: 'يوسف التازي',
        nameFr: 'Youssef Tazi',
        fatherNameAr: 'خالد التازي',
        fatherNameFr: 'Khalid Tazi',
        motherNameAr: 'حليمة السعدية',
        motherNameFr: 'Halima Saadia',
        dateOfBirth: '1995-02-28',
        placeOfBirth: 'Ouled Teima',
        gender: 'M',
      }
    ];

    for (const birth of defaultBirths) {
      if (!birthRecordKeys.has(`${birth.recordNumber}-${birth.recordYear}`)) {
        birthsToInsert.push(birth);
      }
    }

    if (birthsToInsert.length > 0) {
      console.log(`Inserting ${birthsToInsert.length} missing birth record(s)...`);
      await db.insert(birthRecords).values(birthsToInsert);
    }

    // 3. Seed initial Announcements if none exist
    const existingAnnouncements = await db.select().from(announcements).limit(1);
    if (existingAnnouncements.length === 0) {
      console.log('Seeding initial announcements...');
      await db.insert(announcements).values([
        {
          titleAr: 'رقمنة خدمات الحالة المدنية بجماعة أولاد تايمة',
          titleFr: 'Digitalisation des services de l\'état civil à Ouled Teima',
          contentAr: 'تعلن جماعة أولاد تايمة عن إطلاق البوابة الإلكترونية الجديدة لتبسيط طلبات الوثائق وتتبعها عن بعد.',
          contentFr: 'La Commune d\'Ouled Teima annonce le lancement de son nouveau portail électronique pour simplifier les demandes de documents et leur suivi en ligne.',
          category: 'announcement',
          isPublished: true,
        },
        {
          titleAr: 'مواقيت عمل مصلحة الحالة المدنية خلال فصل الصيف',
          titleFr: 'Horaires d\'été du bureau de l\'état civil',
          contentAr: 'مصلحة الحالة المدنية ترحب بمرتفقيها من الاثنين إلى الجمعة من الساعة الثامنة والنصف صباحا إلى الساعة الثالثة والنصف بعد الزوال.',
          contentFr: 'Le bureau de l\'état civil accueille le public du lundi au vendredi de 08h30 à 15h30.',
          category: 'notice',
          isPublished: true,
        }
      ]);
    }

    // 4. Seed system settings if none exist
    const existingSettings = await db.select().from(settings).limit(1);
    if (existingSettings.length === 0) {
      console.log('Seeding initial system settings...');
      await db.insert(settings).values([
        { key: 'site_name_ar', value: 'بوابة الحالة المدنية لأولاد تايمة' },
        { key: 'site_name_fr', value: 'Portail État Civil Ouled Teima' },
        { key: 'allow_registrations', value: 'true' },
        { key: 'maintenance_mode', value: 'false' },
      ]);
    }

    console.log('Database seeding process completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
