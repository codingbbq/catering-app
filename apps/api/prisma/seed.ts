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

  // --- Seed Demo Communications ---
  const existingComm = await prisma.communicationLog.findFirst({
    where: { tenantId: tenant.id },
  });

  if (!existingComm) {
    const quote2 = await prisma.quotation.findFirst({
      where: { tenantId: tenant.id, quotationNumber: 'QT-202611-0002' },
    });
    const booking1 = await prisma.booking.findFirst({
      where: { tenantId: tenant.id, bookingNumber: 'BK-202611-0001' },
    });

    await prisma.communicationLog.createMany({
      data: [
        {
          tenantId: tenant.id,
          customerId: customer1.id,
          enquiryId: enquiry1 ? enquiry1.id : null,
          quotationId: quote2 ? quote2.id : null,
          channel: 'email',
          direction: 'outbound',
          status: 'delivered',
          recipient: 'events@apextech.test',
          sender: 'sales@democatering.test',
          subject: 'Quotation QT-202611-0002 for Annual Gala Dinner',
          content: 'Dear Apex Events Team,\n\nPlease find attached quotation QT-202611-0002 for your upcoming Annual Gala Dinner. The proposal reflects the revised premium cocktail reception and 4-course banquet.',
          provider: 'mock-provider',
          providerMessageId: 'mock_email_seed_001',
          retryCount: 0,
          sentAt: new Date('2026-11-10T14:30:00Z'),
          deliveredAt: new Date('2026-11-10T14:31:00Z'),
        },
        {
          tenantId: tenant.id,
          customerId: customer1.id,
          enquiryId: enquiry1 ? enquiry1.id : null,
          bookingId: booking1 ? booking1.id : null,
          channel: 'whatsapp',
          direction: 'outbound',
          status: 'delivered',
          recipient: '+91 98765 43210',
          sender: '+91 80 4000 1234',
          content: 'Hello Vikram! Delighted to confirm booking BK-202611-0001 for Dec 18 at The Grand Peacock Ballroom. Chef team has locked in raw material procurement schedules.',
          provider: 'mock-provider',
          providerMessageId: 'mock_wa_seed_002',
          retryCount: 0,
          sentAt: new Date('2026-11-11T09:15:00Z'),
          deliveredAt: new Date('2026-11-11T09:15:30Z'),
        },
        {
          tenantId: tenant.id,
          customerId: customer1.id,
          bookingId: booking1 ? booking1.id : null,
          channel: 'sms',
          direction: 'outbound',
          status: 'sent',
          recipient: '+91 98765 43210',
          sender: 'DMOCAT',
          content: 'Reminder: Catering event BK-202611-0001 confirmed for 18-Dec-2026. On-site setup crew arrives at 16:00. Ops Lead: +91 98111 22334.',
          provider: 'mock-provider',
          providerMessageId: 'mock_sms_seed_003',
          retryCount: 0,
          sentAt: new Date('2026-11-11T16:00:00Z'),
        },
        {
          tenantId: tenant.id,
          customerId: customer1.id,
          bookingId: booking1 ? booking1.id : null,
          channel: 'internal_note',
          direction: 'outbound',
          status: 'delivered',
          recipient: 'Executive Chef & Ops Lead',
          sender: 'Sales Desk',
          subject: 'Special VIP Dietary Requirements Flagged',
          content: 'Guest count increased to 350. Please ensure 40 strictly Jain/gluten-free dessert platters are individually labeled and served on station 3.',
          provider: 'internal',
          providerMessageId: 'mock_note_seed_004',
          retryCount: 0,
          sentAt: new Date('2026-11-12T08:00:00Z'),
          deliveredAt: new Date('2026-11-12T08:00:00Z'),
        },
        {
          tenantId: tenant.id,
          customerId: customer1.id,
          channel: 'email',
          direction: 'outbound',
          status: 'failed',
          recipient: 'invalid-finance-desk@invalid-domain.test',
          sender: 'billing@democatering.test',
          subject: 'Advance Milestone Invoice Reminder',
          content: 'Please find the advance milestone invoice due for the upcoming corporate catering service.',
          provider: 'mock-provider',
          providerMessageId: 'mock_email_failed_005',
          errorMessage: 'Upstream gateway rejected delivery to invalid-finance-desk@invalid-domain.test: Invalid contact destination.',
          retryCount: 1,
          sentAt: new Date('2026-11-12T09:30:00Z'),
        },
      ],
    });
    console.log('Seeded demo communication logs (Email, WhatsApp, SMS, Internal Note, and Failed Retry test)');
  }

  // --- Seed Demo Daily Meal Plans & Orders (DMO-001) ---
  const existingMealPlan = await prisma.dailyMealPlan.findFirst({
    where: { tenantId: tenant.id },
  });

  if (!existingMealPlan) {
    const demoMenu = await prisma.menu.findFirst({
      where: { tenantId: tenant.id },
    });
    const demoCatalogueItem = await prisma.catalogueItem.findFirst({
      where: { tenantId: tenant.id },
    });

    const mealPlan1 = await prisma.dailyMealPlan.create({
      data: {
        tenantId: tenant.id,
        planNumber: 'DMP-202611-0001',
        name: 'Apex Tech Daily Executive Lunch',
        status: 'active',
        customerId: customer1.id,
        serviceSlot: 'lunch',
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        startDate: new Date('2026-11-01T00:00:00Z'),
        defaultMenuId: demoMenu ? demoMenu.id : null,
        defaultQuantity: 45,
        defaultUnitPrice: 180,
        deliveryAddress: 'Cafeteria Wing B, 42 Tech Park, Outer Ring Road, Bangalore',
        deliveryNotes: 'Deliver to 3rd floor pantry by 12:15 PM sharp. Contact security desk for freight elevator.',
        dietaryNotes: '10 Vegetarian (Jain-friendly), 35 Standard Corporate Meals. Strictly peanut-free.',
        notes: 'Corporate weekly invoiced account with agreed SLA of 12:15 PM delivery.',
      },
    });
    console.log(`Seeded daily meal plan: ${mealPlan1.planNumber} (${mealPlan1.name})`);

    // Today's date normalized
    const today = new Date();
    today.setHours(12, 30, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Order 1: Today Lunch (In Preparation)
    const order1 = await prisma.dailyMealOrder.create({
      data: {
        tenantId: tenant.id,
        orderNumber: 'DMO-202611-0001',
        status: 'in_preparation',
        customerId: customer1.id,
        planId: mealPlan1.id,
        menuId: demoMenu ? demoMenu.id : null,
        serviceDate: today,
        serviceSlot: 'lunch',
        deliveryAddress: 'Cafeteria Wing B, 42 Tech Park, Outer Ring Road, Bangalore',
        deliveryNotes: 'Freight elevator gate 2. Call ops upon arrival.',
        dietaryNotes: '10 Vegetarian, 35 Standard Non-Veg.',
        currency: 'INR',
        subtotal: 8100,
        taxRate: 5,
        taxAmount: 405,
        discountAmount: 0,
        totalAmount: 8505,
        totalQuantity: 45,
        notes: 'Standing plan weekday delivery.',
        lines: {
          create: [
            {
              catalogueItemId: demoCatalogueItem ? demoCatalogueItem.id : null,
              name: 'Executive Bento Lunch - Standard',
              description: 'Fresh warm meal tray with main curry, rice, bread, salad, dessert',
              quantity: 35,
              unitPrice: 180,
              totalAmount: 6300,
              dietaryNotes: 'Regular',
              sortOrder: 0,
            },
            {
              name: 'Executive Bento Lunch - Jain Veg',
              description: 'No onion, no garlic vegetarian meal box',
              quantity: 10,
              unitPrice: 180,
              totalAmount: 1800,
              dietaryNotes: 'Strict Jain Veg',
              sortOrder: 1,
            },
          ],
        },
      },
    });

    // Order 2: Today Morning Tea for Customer 2 (Dispatched)
    const order2 = await prisma.dailyMealOrder.create({
      data: {
        tenantId: tenant.id,
        orderNumber: 'DMO-202611-0002',
        status: 'dispatched',
        customerId: customer2.id,
        serviceDate: today,
        serviceSlot: 'morning_tea',
        deliveryAddress: 'Villa 14, Palm Meadows, Bangalore',
        deliveryNotes: 'Leave with resident concierge.',
        dietaryNotes: 'Gluten-free snacks requested.',
        currency: 'INR',
        subtotal: 3600,
        taxRate: 5,
        taxAmount: 180,
        discountAmount: 0,
        totalAmount: 3780,
        totalQuantity: 20,
        notes: 'Special morning workshop refreshments.',
        lines: {
          create: [
            {
              name: 'Artisan Morning Tea & Pastry Box',
              description: 'Assorted finger pastries, savory puff, masala chai flask',
              quantity: 20,
              unitPrice: 180,
              totalAmount: 3600,
              sortOrder: 0,
            },
          ],
        },
      },
    });

    // Order 3: Tomorrow Lunch (Confirmed)
    await prisma.dailyMealOrder.create({
      data: {
        tenantId: tenant.id,
        orderNumber: 'DMO-202611-0003',
        status: 'confirmed',
        customerId: customer1.id,
        planId: mealPlan1.id,
        serviceDate: tomorrow,
        serviceSlot: 'lunch',
        deliveryAddress: 'Cafeteria Wing B, 42 Tech Park, Outer Ring Road, Bangalore',
        deliveryNotes: 'Standard delivery protocol.',
        dietaryNotes: '10 Veg, 35 Non-Veg',
        currency: 'INR',
        subtotal: 8100,
        taxRate: 5,
        taxAmount: 405,
        discountAmount: 0,
        totalAmount: 8505,
        totalQuantity: 45,
        notes: 'Scheduled tomorrow order from plan.',
        lines: {
          create: [
            {
              name: 'Executive Bento Lunch - Standard',
              quantity: 35,
              unitPrice: 180,
              totalAmount: 6300,
              sortOrder: 0,
            },
            {
              name: 'Executive Bento Lunch - Veg',
              quantity: 10,
              unitPrice: 180,
              totalAmount: 1800,
              sortOrder: 1,
            },
          ],
        },
      },
    });

    // Order 4: Yesterday Lunch (Delivered & linked to Invoice)
    const order4 = await prisma.dailyMealOrder.create({
      data: {
        tenantId: tenant.id,
        orderNumber: 'DMO-202611-0004',
        status: 'delivered',
        customerId: customer1.id,
        planId: mealPlan1.id,
        serviceDate: yesterday,
        serviceSlot: 'lunch',
        deliveryAddress: 'Cafeteria Wing B, 42 Tech Park, Outer Ring Road, Bangalore',
        currency: 'INR',
        subtotal: 8100,
        taxRate: 5,
        taxAmount: 405,
        discountAmount: 0,
        totalAmount: 8505,
        totalQuantity: 45,
        lines: {
          create: [
            {
              name: 'Executive Bento Lunch - Standard',
              quantity: 45,
              unitPrice: 180,
              totalAmount: 8100,
              sortOrder: 0,
            },
          ],
        },
      },
    });

    // Create linked invoice for Order 4
    await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        invoiceNumber: 'INV-202611-0099',
        status: 'issued',
        customerId: customer1.id,
        dailyMealOrderId: order4.id,
        title: 'Daily Meal Order Service - DMO-202611-0004',
        issueDate: yesterday,
        dueDate: new Date(yesterday.getTime() + 14 * 24 * 60 * 60 * 1000),
        currency: 'INR',
        subtotal: 8100,
        taxRate: 5,
        taxAmount: 405,
        discountAmount: 0,
        totalAmount: 8505,
        paidAmount: 0,
        balanceDue: 8505,
        notes: 'Automated invoice generated for Daily Meal Order DMO-202611-0004.',
        terms: 'Net 14 Days from receipt.',
        issuedAt: yesterday,
        lineItems: {
          create: [
            {
              description: 'Executive Bento Lunch - Standard (Daily Meal Order DMO-202611-0004)',
              quantity: 45,
              unitPrice: 180,
              totalAmount: 8100,
              sortOrder: 0,
            },
          ],
        },
      },
    });

    console.log(`Seeded 4 daily meal orders and 1 linked invoice for demo tenant`);
  }

  // Seed OPS-001: Inventory Items and Stock Movements
  const existingInventory = await prisma.inventoryItem.count({ where: { tenantId: tenant.id } });
  if (existingInventory === 0) {
    const rawItems = [
      {
        sku: 'ING-BAS-001',
        name: 'Royal Basmati Rice Aged',
        description: 'Premium aged extra-long grain basmati rice for biryanis and pilafs',
        category: 'dry_goods' as const,
        unit: 'kg',
        currentStock: 120.0,
        minStockLevel: 50.0,
        maxStockLevel: 300.0,
        reorderQuantity: 100.0,
        unitCost: 140.0,
        storageLocation: 'Dry Pantry A - Rack 1',
      },
      {
        sku: 'ING-PAN-002',
        name: 'Fresh Malai Paneer',
        description: 'Farm-fresh cottage cheese vacuum packed daily',
        category: 'dairy' as const,
        unit: 'kg',
        currentStock: 14.5,
        minStockLevel: 20.0, // Low stock alert!
        maxStockLevel: 60.0,
        reorderQuantity: 30.0,
        unitCost: 340.0,
        storageLocation: 'Cold Storage Room 1 - Shelf B',
      },
      {
        sku: 'ING-CHK-003',
        name: 'Fresh Boneless Chicken Breast',
        description: 'Hygienically dressed boneless poultry breasts',
        category: 'meat_poultry' as const,
        unit: 'kg',
        currentStock: 45.0,
        minStockLevel: 25.0,
        maxStockLevel: 100.0,
        reorderQuantity: 50.0,
        unitCost: 260.0,
        storageLocation: 'Deep Freeze - Bay 3',
      },
      {
        sku: 'ING-OIL-004',
        name: 'Pure Desi Cow Ghee',
        description: 'Aromatic traditional clarified butter for royal dishes and sweets',
        category: 'dairy' as const,
        unit: 'ltr',
        currentStock: 35.0,
        minStockLevel: 15.0,
        maxStockLevel: 80.0,
        reorderQuantity: 30.0,
        unitCost: 650.0,
        storageLocation: 'Dry Pantry B - Tier 2',
      },
      {
        sku: 'ING-VEG-005',
        name: 'Fresh Farm Tomatoes (Roma)',
        description: 'Vine-ripened firm red tomatoes for gravies and salads',
        category: 'produce' as const,
        unit: 'kg',
        currentStock: 8.0,
        minStockLevel: 25.0, // Low stock alert!
        maxStockLevel: 80.0,
        reorderQuantity: 40.0,
        unitCost: 35.0,
        storageLocation: 'Walk-in Chiller - Bin 4',
      },
      {
        sku: 'PKG-BOX-006',
        name: 'Eco 5-Compartment Meal Tray',
        description: 'Biodegradable bagasse meal trays with tight-fit clear lids',
        category: 'packaging' as const,
        unit: 'piece',
        currentStock: 450.0,
        minStockLevel: 200.0,
        maxStockLevel: 1500.0,
        reorderQuantity: 500.0,
        unitCost: 6.5,
        storageLocation: 'Packaging Warehouse - Bay A',
      },
      {
        sku: 'BEV-TEA-007',
        name: 'Assam Gold Tea Leaves',
        description: 'High-grown strong CTC tea leaves for high-tea service',
        category: 'beverages' as const,
        unit: 'kg',
        currentStock: 0.0, // Out of stock alert!
        minStockLevel: 10.0,
        maxStockLevel: 40.0,
        reorderQuantity: 20.0,
        unitCost: 380.0,
        storageLocation: 'Beverage Bar Pantry',
      },
    ];

    for (const [idx, itemData] of rawItems.entries()) {
      const createdItem = await prisma.inventoryItem.create({
        data: {
          tenantId: tenant.id,
          sku: itemData.sku,
          name: itemData.name,
          description: itemData.description,
          category: itemData.category,
          unit: itemData.unit,
          currentStock: itemData.currentStock,
          minStockLevel: itemData.minStockLevel,
          maxStockLevel: itemData.maxStockLevel,
          reorderQuantity: itemData.reorderQuantity,
          unitCost: itemData.unitCost,
          storageLocation: itemData.storageLocation,
        },
      });

      if (itemData.currentStock > 0) {
        await prisma.stockMovement.create({
          data: {
            tenantId: tenant.id,
            movementNumber: `SM-202611-000${idx + 1}`,
            inventoryItemId: createdItem.id,
            type: 'purchase_received',
            quantity: itemData.currentStock + (itemData.sku === 'ING-PAN-002' ? 10.0 : 0),
            signedQuantity: itemData.currentStock + (itemData.sku === 'ING-PAN-002' ? 10.0 : 0),
            quantityBefore: 0,
            quantityAfter: itemData.currentStock + (itemData.sku === 'ING-PAN-002' ? 10.0 : 0),
            unitCost: itemData.unitCost,
            totalCost: (itemData.currentStock + (itemData.sku === 'ING-PAN-002' ? 10.0 : 0)) * itemData.unitCost,
            referenceType: 'purchase_order',
            referenceId: `PO-202611-${100 + idx}`,
            reason: 'Opening stock shipment from verified vendor',
            recordedBy: 'procurement@demo.test',
          },
        });

        // Add a kitchen consumption movement for Paneer to show usage history
        if (itemData.sku === 'ING-PAN-002') {
          await prisma.stockMovement.create({
            data: {
              tenantId: tenant.id,
              movementNumber: `SM-202611-0099`,
              inventoryItemId: createdItem.id,
              type: 'kitchen_consumption',
              quantity: 10.0,
              signedQuantity: -10.0,
              quantityBefore: 24.5,
              quantityAfter: 14.5,
              unitCost: itemData.unitCost,
              totalCost: 10.0 * itemData.unitCost,
              referenceType: 'daily_meal_order',
              referenceId: 'DMO-202611-0001',
              reason: 'Paneer Tikka Bento box batch prep for TechCorp',
              recordedBy: 'headchef@demo.test',
            },
          });
        }
      }
    }

    console.log(`Seeded 7 inventory items with stock movement ledger for demo tenant`);
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
