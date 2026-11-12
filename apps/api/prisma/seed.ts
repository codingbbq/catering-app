import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  console.log('Seeding database...');

  // --- Platform admin ---
  const platformAdmin = await prisma.platformUser.upsert({
    where: { email: 'admin@platform.test' },
    update: {},
    create: {
      email: 'admin@platform.test',
      passwordHash: await bcrypt.hash('Admin@12345678', SALT_ROUNDS),
      displayName: 'Platform Admin',
      role: 'super_admin',
    },
  });
  console.log(`Platform admin: ${platformAdmin.email} / Admin@12345678`);

  // --- Demo tenant ---
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-catering' },
    update: {},
    create: {
      slug: 'demo-catering',
      displayName: 'Demo Catering Co',
      status: 'active',
    },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      timezone: 'Asia/Kolkata',
      currencyCode: 'INR',
      locale: 'en-IN',
    },
  });
  console.log(`Tenant: ${tenant.displayName} (${tenant.slug})`);

  // --- Tenant owner ---
  const tenantOwner = await prisma.tenantUser.upsert({
    where: { email_tenantId: { email: 'owner@demo.test', tenantId: tenant.id } },
    update: {},
    create: {
      email: 'owner@demo.test',
      passwordHash: await bcrypt.hash('Owner@12345678', SALT_ROUNDS),
      displayName: 'Tenant Owner',
      role: 'owner',
      tenantId: tenant.id,
    },
  });
  console.log(`Tenant owner: ${tenantOwner.email} / Owner@12345678`);

  // --- Seed Demo Customers ---
  let customer1 = await prisma.customer.findFirst({
    where: { tenantId: tenant.id, email: 'events@apextech.test' },
  });
  if (!customer1) {
    customer1 = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: 'Apex Innovations Ltd',
        email: 'events@apextech.test',
        phone: '+91 98765 43210',
        address: '42 Tech Park, Outer Ring Road, Bangalore',
      },
    });
  }

  let customer2 = await prisma.customer.findFirst({
    where: { tenantId: tenant.id, email: 'priya.sharma@gmail.test' },
  });
  if (!customer2) {
    customer2 = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: 'Priya & Rohan Sharma',
        email: 'priya.sharma@gmail.test',
        phone: '+91 98111 22334',
        address: 'Villa 14, Palm Meadows, Bangalore',
      },
    });
  }
  console.log('Seeded demo customers');

  // --- Seed Demo Enquiries ---
  let enquiry1 = await prisma.enquiry.findFirst({
    where: { tenantId: tenant.id, title: 'Annual Tech Summit Gala Dinner' },
  });
  if (!enquiry1) {
    enquiry1 = await prisma.enquiry.create({
      data: {
        tenantId: tenant.id,
        customerId: customer1.id,
        title: 'Annual Tech Summit Gala Dinner',
        status: 'proposal_sent',
        serviceType: 'event_catering',
        eventDate: new Date('2026-12-15T18:30:00Z'),
        guestCount: 120,
        eventType: 'Corporate Gala',
        venue: 'Grand Ball Room, The Leela Palace',
        estimatedBudget: 8000,
        notes: 'VIP plated dinner followed by dessert station and cocktail hour.',
        nextAction: 'Follow up on revised quotation v2',
        nextActionDate: new Date('2026-11-20T10:00:00Z'),
        assignedToId: tenantOwner.id,
      },
    });
  }

  let enquiry2 = await prisma.enquiry.findFirst({
    where: { tenantId: tenant.id, title: 'Heritage Wedding Reception Dinner' },
  });
  if (!enquiry2) {
    enquiry2 = await prisma.enquiry.create({
      data: {
        tenantId: tenant.id,
        customerId: customer2.id,
        title: 'Heritage Wedding Reception Dinner',
        status: 'converted',
        serviceType: 'event_catering',
        eventDate: new Date('2027-01-10T19:00:00Z'),
        guestCount: 250,
        eventType: 'Wedding Reception',
        venue: 'Palace Grounds, Sheesh Mahal',
        estimatedBudget: 15000,
        notes: 'Royal Indian banquet with live chaat and kebab counters.',
        nextAction: 'Prepare booking agreement and deposit invoice',
        assignedToId: tenantOwner.id,
      },
    });
  }
  console.log('Seeded demo enquiries');

  // --- Seed Demo Menu ---
  let menu1 = await prisma.menu.findFirst({
    where: { tenantId: tenant.id, name: 'Royal Banquet 3-Course Menu' },
  });
  if (!menu1) {
    menu1 = await prisma.menu.create({
      data: {
        tenantId: tenant.id,
        name: 'Royal Banquet 3-Course Menu',
        description: 'Premium curated three-course plated dinner experience with live counters.',
        serviceStyle: 'buffet',
        status: 'active',
        minGuests: 50,
        items: {
          create: [
            {
              section: 'Appetizers',
              name: 'Paneer Tikka & Galouti Kebabs',
              description: 'Tandoor smoked paneer and melt-in-mouth kebabs',
              quantity: 1,
              unitPrice: 15,
              costPrice: 6.5,
              dietaryTags: ['Vegetarian', 'Gluten-Free'],
              sortOrder: 0,
            },
            {
              section: 'Mains',
              name: 'Murgh Makhani & Dal Bukhara',
              description: 'Slow-cooked signature chicken and 18-hour black lentils',
              quantity: 1,
              unitPrice: 28,
              costPrice: 11,
              dietaryTags: ['Signature'],
              sortOrder: 1,
            },
            {
              section: 'Dessert',
              name: 'Shahi Tukda with Saffron Rabdi',
              description: 'Crisp bread pudding soaked in cardamom syrup and saffron cream',
              quantity: 1,
              unitPrice: 12,
              costPrice: 4,
              dietaryTags: ['Vegetarian'],
              sortOrder: 2,
            },
          ],
        },
      },
    });
  }

  // --- Seed Demo Quotations with Revisions ---
  const existingQuote1 = await prisma.quotation.findFirst({
    where: { tenantId: tenant.id, quotationNumber: 'QT-202611-0001' },
  });

  if (!existingQuote1) {
    const quote1 = await prisma.quotation.create({
      data: {
        tenantId: tenant.id,
        enquiryId: enquiry1.id,
        quotationNumber: 'QT-202611-0001',
        title: 'Annual Tech Summit Gala Catering Proposal',
        status: 'sent',
        currentRevisionNumber: 2,
        validUntil: new Date('2026-11-30T23:59:59Z'),
        notes: 'Includes buffet setup, fine bone china crockery, and dedicated service staff for 5 hours.',
        terms: '50% advance on confirmation. Balance 50% 7 days prior to event.',
        revisions: {
          create: [
            {
              revisionNumber: 1,
              status: 'superseded',
              menuId: menu1.id,
              guestCount: 100,
              pricePerPerson: 52.5,
              subtotal: 5000,
              taxPercent: 5,
              taxAmount: 250,
              discountAmount: 0,
              totalAmount: 5250,
              estimatedCost: 2400,
              estimatedMarginPercent: 52,
              notes: 'Initial quotation based on 100 guests estimate.',
              changeSummary: 'Initial proposal prepared',
              createdByUserId: tenantOwner.id,
              items: {
                create: [
                  {
                    name: 'Curated 3-Course Banquet Experience',
                    description: 'Starters, Main Course, and Dessert buffet',
                    category: 'Food & Beverage',
                    quantity: 100,
                    unit: 'guest',
                    unitPrice: 50,
                    totalPrice: 5000,
                    unitCost: 24,
                    totalCost: 2400,
                    sortOrder: 0,
                  },
                ],
              },
            },
            {
              revisionNumber: 2,
              status: 'sent',
              menuId: menu1.id,
              guestCount: 120,
              pricePerPerson: 57.75,
              subtotal: 6800,
              taxPercent: 5,
              taxAmount: 330,
              discountAmount: 200,
              totalAmount: 6930,
              estimatedCost: 3240,
              estimatedMarginPercent: 50.9,
              notes: 'Revised to 120 guests with complimentary Mocktail & Beverage bar package.',
              changeSummary: 'Updated guest count to 120, added live pasta station and beverage package with $200 corporate discount.',
              createdByUserId: tenantOwner.id,
              items: {
                create: [
                  {
                    name: 'Curated 3-Course Banquet Experience',
                    description: 'Starters, Main Course, and Dessert buffet',
                    category: 'Food & Beverage',
                    quantity: 120,
                    unit: 'guest',
                    unitPrice: 48,
                    totalPrice: 5760,
                    unitCost: 23,
                    totalCost: 2760,
                    sortOrder: 0,
                  },
                  {
                    name: 'Artisanal Mocktail & Fresh Juice Bar',
                    description: '3 signature mocktails, soft beverages, mineral water',
                    category: 'Beverage & Bar',
                    quantity: 120,
                    unit: 'guest',
                    unitPrice: 7,
                    totalPrice: 840,
                    unitCost: 3,
                    totalCost: 360,
                    sortOrder: 1,
                  },
                  {
                    name: 'Uniformed Banquet Service Team',
                    description: '1 captain, 4 banquet servers, 2 kitchen stewards for 5 hours',
                    category: 'Service & Staffing',
                    quantity: 1,
                    unit: 'set',
                    unitPrice: 200,
                    totalPrice: 200,
                    unitCost: 120,
                    totalCost: 120,
                    sortOrder: 2,
                  },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`Seeded quotation: ${quote1.quotationNumber} (v2 sent)`);
  }

  const existingQuote2 = await prisma.quotation.findFirst({
    where: { tenantId: tenant.id, quotationNumber: 'QT-202611-0002' },
  });

  if (!existingQuote2) {
    const quote2 = await prisma.quotation.create({
      data: {
        tenantId: tenant.id,
        enquiryId: enquiry2.id,
        quotationNumber: 'QT-202611-0002',
        title: 'Heritage Wedding Grand Royal Reception',
        status: 'accepted',
        currentRevisionNumber: 1,
        validUntil: new Date('2026-12-31T23:59:59Z'),
        notes: 'Accepted by Priya Sharma. Pre-wedding tasting completed.',
        terms: 'Payment terms: 30% advance on signing, 50% 14 days before wedding, 20% on event completion.',
        revisions: {
          create: [
            {
              revisionNumber: 1,
              status: 'accepted',
              menuId: menu1.id,
              guestCount: 250,
              pricePerPerson: 57.75,
              subtotal: 14250,
              taxPercent: 5,
              taxAmount: 687.5,
              discountAmount: 500,
              totalAmount: 14437.5,
              estimatedCost: 6800,
              estimatedMarginPercent: 50.5,
              notes: 'Grand wedding reception package approved with full live counters.',
              changeSummary: 'Finalized wedding reception package with custom royal dessert counter',
              createdByUserId: tenantOwner.id,
              items: {
                create: [
                  {
                    name: 'Royal Heritage Feast Buffet (6 Starters, 8 Mains)',
                    description: 'Traditional and continental selections with live naan tandoor',
                    category: 'Food & Beverage',
                    quantity: 250,
                    unit: 'guest',
                    unitPrice: 50,
                    totalPrice: 12500,
                    unitCost: 22,
                    totalCost: 5500,
                    sortOrder: 0,
                  },
                  {
                    name: 'Live Chaat & Kebab Counter Stations',
                    description: '2 dedicated chefs running live street food and tandoori grill',
                    category: 'Food & Beverage',
                    quantity: 250,
                    unit: 'guest',
                    unitPrice: 6,
                    totalPrice: 1500,
                    unitCost: 2.8,
                    totalCost: 700,
                    sortOrder: 1,
                  },
                  {
                    name: 'Royal Dessert Display & Kulfi Cart',
                    description: 'Jalebi with Rabdi, Hot Gulab Jamun, Handcrafted Kulfis',
                    category: 'Food & Beverage',
                    quantity: 1,
                    unit: 'set',
                    unitPrice: 250,
                    totalPrice: 250,
                    unitCost: 100,
                    totalCost: 100,
                    sortOrder: 2,
                  },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`Seeded quotation: ${quote2.quotationNumber} (v1 accepted)`);
  }

  const existingQuote3 = await prisma.quotation.findFirst({
    where: { tenantId: tenant.id, quotationNumber: 'QT-202611-0003' },
  });

  if (!existingQuote3) {
    const quote3 = await prisma.quotation.create({
      data: {
        tenantId: tenant.id,
        enquiryId: enquiry1.id,
        quotationNumber: 'QT-202611-0003',
        title: 'Executive Boardroom Luncheon Option',
        status: 'draft',
        currentRevisionNumber: 1,
        validUntil: new Date('2026-11-25T23:59:59Z'),
        notes: 'Alternative lightweight executive plated lunch option.',
        terms: 'Net 15 days corporate billing.',
        revisions: {
          create: [
            {
              revisionNumber: 1,
              status: 'draft',
              guestCount: 25,
              pricePerPerson: 47.25,
              subtotal: 1125,
              taxPercent: 5,
              taxAmount: 56.25,
              discountAmount: 0,
              totalAmount: 1181.25,
              estimatedCost: 520,
              estimatedMarginPercent: 53.8,
              notes: 'Draft proposal prepared for procurement review.',
              changeSummary: 'Initial proposal prepared',
              createdByUserId: tenantOwner.id,
              items: {
                create: [
                  {
                    name: 'Executive Gourmet Bento Platter',
                    description: 'Individual gourmet platters with salad, entree, artisan bread, dessert',
                    category: 'Food & Beverage',
                    quantity: 25,
                    unit: 'guest',
                    unitPrice: 45,
                    totalPrice: 1125,
                    unitCost: 20.8,
                    totalCost: 520,
                    sortOrder: 0,
                  },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`Seeded quotation: ${quote3.quotationNumber} (v1 draft)`);
  }

  // --- Seed Demo Bookings ---
  const existingBooking1 = await prisma.booking.findFirst({
    where: { tenantId: tenant.id, bookingNumber: 'BK-202611-0001' },
  });

  if (!existingBooking1) {
    const quote2 = await prisma.quotation.findFirst({
      where: { tenantId: tenant.id, quotationNumber: 'QT-202611-0002' },
    });

    const booking1 = await prisma.booking.create({
      data: {
        tenantId: tenant.id,
        bookingNumber: 'BK-202611-0001',
        title: 'Sharma Wedding Reception Dinner Banquet',
        status: 'confirmed',
        customerId: customer2.id,
        quotationId: quote2 ? quote2.id : null,
        enquiryId: enquiry2 ? enquiry2.id : null,
        serviceType: 'event_catering',
        eventDate: new Date('2026-12-18T18:30:00Z'),
        guestCount: 350,
        venueName: 'The Leela Palace Royal Ballroom',
        venueAddress: '23 HAL Airport Rd, Kodihalli, Bengaluru, Karnataka 560008',
        contactName: 'Priya Sharma',
        contactPhone: '+91 98111 22334',
        contactEmail: 'priya.sharma@gmail.test',
        specialInstructions: 'Live chaat station requires dedicated electrical phase (15A). 50 guests require Jain-compatible preparation.',
        totalAmount: 432075.0,
        currency: 'INR',
        confirmedAt: new Date('2026-11-12T10:30:00Z'),
        schedules: {
          create: [
            {
              title: 'Kitchen & Service Load-in & Equipment Setup',
              scheduledDate: new Date('2026-12-18T12:00:00Z'),
              startTime: '12:00',
              endTime: '15:00',
              description: 'Service staff arrival, warming stations setup, live chaat counter prep',
              location: 'Ballroom Service Kitchen & Back Lawn',
              sortOrder: 0,
            },
            {
              title: 'Welcome Mocktails & Live Appetizer Service',
              scheduledDate: new Date('2026-12-18T18:00:00Z'),
              startTime: '18:00',
              endTime: '19:30',
              description: 'Live pass-around appetizers, fresh fruit counters, welcome drinks',
              location: 'Ballroom Foyer & Lawn',
              sortOrder: 1,
            },
            {
              title: 'Royal Indian Wedding Buffet Dinner',
              scheduledDate: new Date('2026-12-18T19:45:00Z'),
              startTime: '19:45',
              endTime: '22:30',
              description: 'Full buffet spread, live tandoori naan/roti station, dessert display',
              location: 'Main Ballroom',
              sortOrder: 2,
            },
            {
              title: 'Station Packdown & Clean-up',
              scheduledDate: new Date('2026-12-18T22:45:00Z'),
              startTime: '22:45',
              endTime: '23:45',
              description: 'Clearing food stations, waste segregation, loading outbound vehicles',
              location: 'Service Kitchen',
              sortOrder: 3,
            },
          ],
        },
      },
    });
    console.log(`Seeded booking: ${booking1.bookingNumber} (${booking1.title} - confirmed)`);
  }

  const existingBooking2 = await prisma.booking.findFirst({
    where: { tenantId: tenant.id, bookingNumber: 'BK-202611-0002' },
  });

  if (!existingBooking2) {
    const booking2 = await prisma.booking.create({
      data: {
        tenantId: tenant.id,
        bookingNumber: 'BK-202611-0002',
        title: 'Apex Tech Summit VIP Networking Luncheon',
        status: 'confirmed',
        customerId: customer1.id,
        enquiryId: enquiry1 ? enquiry1.id : null,
        serviceType: 'event_catering',
        eventDate: new Date('2026-11-28T12:30:00Z'),
        guestCount: 120,
        venueName: 'Apex Innovation Center Auditorium',
        venueAddress: '42 Tech Park, Outer Ring Road, Bangalore',
        contactName: 'Vikram Mehta',
        contactPhone: '+91 98765 43210',
        contactEmail: 'events@apextech.test',
        specialInstructions: 'Buffet line must be operational promptly by 12:45 PM between keynote sessions.',
        totalAmount: 185000.0,
        currency: 'INR',
        confirmedAt: new Date('2026-11-12T11:00:00Z'),
        schedules: {
          create: [
            {
              title: 'Kitchen Arrival & Lunch Buffet Prep',
              scheduledDate: new Date('2026-11-28T10:00:00Z'),
              startTime: '10:00',
              endTime: '12:00',
              description: 'Buffet setup in breakout area, coffee station prep',
              location: 'Breakout Hall 2',
              sortOrder: 0,
            },
            {
              title: 'Networking Buffet Lunch Service',
              scheduledDate: new Date('2026-11-28T12:30:00Z'),
              startTime: '12:30',
              endTime: '14:30',
              description: 'Hot buffet lunch service with beverages and dessert',
              location: 'Breakout Hall 2',
              sortOrder: 1,
            },
          ],
        },
      },
    });
    console.log(`Seeded booking: ${booking2.bookingNumber} (${booking2.title} - confirmed)`);
  }

  console.log('\nSeed complete. You can now sign in:');
  console.log('  Platform: POST /platform/auth/sign-in  { email: "admin@platform.test", password: "Admin@12345678" }');
  console.log(`  Tenant:   POST /auth/sign-in/${tenant.slug}  { email: "owner@demo.test", password: "Owner@12345678" }`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
