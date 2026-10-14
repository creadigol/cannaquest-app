// Demo Dataset for CannaQuest Patient PWA
window.DEFAULT_PATIENT_DATA = {
  profile: {
    id: "PT-772910",
    firstName: "Sarah",
    lastName: "Walker",
    fullName: "Sarah Walker",
    initials: "SW",
    email: "sarah.walker@patient.cannaquest.com.au",
    phone: "0412 849 203",
    dateOfBirth: "14 Apr 1988",
    medicareNumber: "2345 88910 2",
    medicareIrn: "1",
    medicareExpiry: "08/2028",
    deliveryAddress: {
      line1: "Unit 4, 128 Crown Street",
      suburb: "Surry Hills",
      state: "NSW",
      postcode: "2010",
      notes: "Leave in safe drop parcel locker behind building gate if unattended."
    },
    clinic: {
      name: "CannaQuest Telehealth Australia",
      suburb: "Sydney",
      state: "NSW",
      phone: "1300 892 110"
    },
    twoFactorEnabled: true,
    documentCount: 3
  },

  careJourney: {
    completedCount: 3,
    totalSteps: 4,
    currentStepKey: "step-4",
    bannerDismissed: false,
    steps: [
      {
        number: 1,
        key: "step-1",
        title: "Health Intake Assessment",
        short_title: "Intake",
        completed: true,
        summary: "Medical history and questionnaire completed."
      },
      {
        number: 2,
        key: "step-2",
        title: "Video Consultation",
        short_title: "Consult",
        completed: true,
        summary: "Telehealth consult held with Dr. Lachlan Vance."
      },
      {
        number: 3,
        key: "step-3",
        title: "Doctor Approval & TGA Script",
        short_title: "Approval",
        completed: true,
        summary: "Authorised Prescriber SAS-B/AP clearance granted."
      },
      {
        number: 4,
        key: "step-4",
        title: "Medication Refills & Monitoring",
        short_title: "Refills",
        completed: false,
        summary: "Ready to order prescribed repeats and monitor therapy."
      }
    ]
  },

  prescriptions: [
    {
      id: "RX-88421",
      name: "Sativite Okanagan 19%",
      manufacturer: "Sativite Australia",
      form: "Flower",
      strength: "19% THC",
      thc: 19.0,
      cbd: 0.1,
      packageSize: "10g Dried Flower",
      unitPrice: 135.00,
      status: "Approved",
      statusColor: "emerald",
      repeatTimes: 5,
      remainingRepeats: 3,
      redeemedRepeats: 2,
      intervalDays: 14,
      isIntervalRestricted: false,
      daysUntilAvailable: 0,
      prescriber: "Dr. Lachlan Vance (MBBS, FRACGP)",
      erxToken: "eRx-9821-4402-AU",
      expiryDate: "14 Oct 2026",
      dosageInstructions: "Vaporise 0.1g – 0.15g in the evening as needed for neuropathic pain management.",
      category: "Flower",
      glowClass: "status-glow-emerald"
    },
    {
      id: "RX-90312",
      name: "Althea CBD100 Oral Liquid",
      manufacturer: "Althea",
      form: "Oil",
      strength: "100mg/mL CBD",
      thc: 0.0,
      cbd: 100.0,
      packageSize: "50mL Bottle",
      unitPrice: 160.00,
      status: "Approved",
      statusColor: "emerald",
      repeatTimes: 6,
      remainingRepeats: 4,
      redeemedRepeats: 2,
      intervalDays: 21,
      isIntervalRestricted: false,
      daysUntilAvailable: 0,
      prescriber: "Dr. Lachlan Vance (MBBS, FRACGP)",
      erxToken: "eRx-1192-3301-AU",
      expiryDate: "20 Nov 2026",
      dosageInstructions: "Administer 0.5mL sublingually twice daily with meals.",
      category: "Oil",
      glowClass: "status-glow-emerald"
    },
    {
      id: "RX-95411",
      name: "Cannatrek T25 Topaz",
      manufacturer: "Cannatrek",
      form: "Flower",
      strength: "25% THC",
      thc: 25.0,
      cbd: 0.0,
      packageSize: "10g Dried Flower",
      unitPrice: 145.00,
      status: "Interval Restricted",
      statusColor: "amber",
      repeatTimes: 4,
      remainingRepeats: 2,
      redeemedRepeats: 2,
      intervalDays: 20,
      isIntervalRestricted: true,
      daysUntilAvailable: 4,
      prescriber: "Dr. Emily Chen (MBBS, RACGP)",
      erxToken: "eRx-6712-8821-AU",
      expiryDate: "05 Dec 2026",
      dosageInstructions: "Vaporise 0.1g as night sedative as tolerated.",
      category: "Flower",
      glowClass: "status-glow-amber"
    }
  ],

  pastPrescriptions: [
    {
      id: "RX-62100",
      name: "Tasmanian Botanics Midlands 18",
      manufacturer: "Tasmanian Botanics",
      form: "Flower",
      strength: "18% THC",
      thc: 18.0,
      cbd: 0.0,
      packageSize: "10g Dried Flower",
      unitPrice: 125.00,
      status: "Expired",
      statusColor: "gray",
      repeatTimes: 4,
      remainingRepeats: 0,
      redeemedRepeats: 4,
      prescriber: "Dr. Lachlan Vance",
      expiryDate: "15 Feb 2026",
      dosageInstructions: "Discontinued after routine clinical follow up."
    }
  ],

  products: [
    {
      id: "prod-1",
      name: "Sativite Okanagan 19%",
      manufacturer: "Sativite",
      form: "Flower",
      category: "Flower",
      thc: 19.0,
      cbd: 0.1,
      strength: "19% THC",
      packageSize: "10g",
      unitPrice: 135.00,
      isAddonDevice: false,
      prescribed: true,
      canPurchase: true,
      description: "High quality Canadian-grown indica dominant craft medical flower with dominant beta-myrcene and caryophyllene terpenes.",
      terpenes: "Myrcene, Caryophyllene, Limonene (2.3% total)",
      indications: "Chronic nerve pain, severe insomnia"
    },
    {
      id: "prod-2",
      name: "Althea CBD100 Oral Liquid",
      manufacturer: "Althea",
      form: "Oil",
      category: "Oil",
      thc: 0.0,
      cbd: 100.0,
      strength: "100mg/mL CBD",
      packageSize: "50mL",
      unitPrice: 160.00,
      isAddonDevice: false,
      prescribed: true,
      canPurchase: true,
      description: "Full-spectrum broad cannabinoid oil extracted in organic MCT carrier oil for smooth daytime relief without impairment.",
      terpenes: "Naturally occurring botanical terpenes",
      indications: "Inflammation, anxiety disorders, muscular spasms"
    },
    {
      id: "prod-3",
      name: "Cannatrek T25 Topaz",
      manufacturer: "Cannatrek",
      form: "Flower",
      category: "Flower",
      thc: 25.0,
      cbd: 0.0,
      strength: "25% THC",
      packageSize: "10g",
      unitPrice: 145.00,
      isAddonDevice: false,
      prescribed: true,
      canPurchase: false,
      intervalRestrictedDays: 4,
      description: "Potent Kush Cookies strain selected for high THC cannabinoid profiles and deep nighttime relaxation.",
      terpenes: "Beta-Caryophyllene, Linalool (2.8% total)",
      indications: "Refractory sleep dysfunction, acute flare-ups"
    },
    {
      id: "prod-4",
      name: "MedCan Ultra01 25%",
      manufacturer: "MedCan",
      form: "Flower",
      category: "Flower",
      thc: 25.0,
      cbd: 0.2,
      strength: "25% THC",
      packageSize: "10g",
      unitPrice: 150.00,
      isAddonDevice: false,
      prescribed: false,
      canPurchase: false,
      description: "Ultra Sour sativa cultivar providing energetic terpene richness. Requires doctor consultation to prescribe.",
      terpenes: "Terpinolene, Limonene (3.1% total)",
      indications: "Daytime fatigue, chronic mood symptoms"
    },
    {
      id: "prod-5",
      name: "Urban Canna Nightfall Cartridge",
      manufacturer: "Urban Canna",
      form: "Cartridge",
      category: "Cartridge",
      thc: 75.0,
      cbd: 2.0,
      strength: "750mg THC / 1g",
      packageSize: "1.0g Vape Cart",
      unitPrice: 89.00,
      isAddonDevice: false,
      prescribed: false,
      canPurchase: false,
      description: "Pure CO2 extracted ceramic cell vape cartridge without cutting agents or vitamin E acetate.",
      terpenes: "Cannabis derived strain-specific terpenes",
      indications: "Rapid onset symptom control"
    },
    {
      id: "prod-dev-1",
      name: "Mighty+ Medic Vaporizer",
      manufacturer: "Storz & Bickel",
      form: "Device",
      category: "Devices",
      thc: 0,
      cbd: 0,
      strength: "TGA Approved ARTG 319028",
      packageSize: "Complete Vaporiser Kit",
      unitPrice: 479.00,
      isAddonDevice: true,
      prescribed: false,
      canPurchase: true,
      description: "Hospital-grade, battery-powered medical vaporiser certified on the Australian Register of Therapeutic Goods (ARTG).",
      terpenes: "N/A",
      indications: "Approved inhalation medical delivery system"
    },
    {
      id: "prod-dev-2",
      name: "Herb Mill Medical Precision Grinder",
      manufacturer: "Storz & Bickel",
      form: "Device",
      category: "Devices",
      thc: 0,
      cbd: 0,
      strength: "Medical Grade XL",
      packageSize: "1 Unit",
      unitPrice: 35.00,
      isAddonDevice: true,
      prescribed: false,
      canPurchase: true,
      description: "Hygienic easy-twist medical preparation grinder with consistent particle size control.",
      terpenes: "N/A",
      indications: "Herb preparation"
    },
    {
      id: "prod-dev-3",
      name: "Boveda 62% Terpene Shield (10-Pack)",
      manufacturer: "Boveda",
      form: "Device",
      category: "Devices",
      thc: 0,
      cbd: 0,
      strength: "62% 2-Way Humidity",
      packageSize: "10 × 4g Sachets",
      unitPrice: 22.00,
      isAddonDevice: true,
      prescribed: false,
      canPurchase: true,
      description: "Monitors and preserves trichome moisture and fragile terpene aromatic profiles in medication tubs.",
      terpenes: "N/A",
      indications: "Medication storage stability"
    }
  ],

  upcomingConsultations: [
    {
      id: "CONS-4091",
      prescriberName: "Dr. Lachlan Vance",
      prescriberTitle: "Authorised Prescriber (TGA)",
      clinicName: "CannaQuest Telehealth Hub",
      bookDate: "Tomorrow, 7 Oct",
      startTime: "2:30 PM",
      timeUntil: "TOMORROW • 2:30 PM AEST",
      canJoin: true,
      type: "Video Telehealth Call",
      purpose: "6-Month Treatment Plan Review & Script Refill Re-authorization"
    }
  ],

  pastConsultations: [
    {
      id: "CONS-2890",
      prescriberName: "Dr. Lachlan Vance",
      prescriberTitle: "Authorised Prescriber",
      clinicName: "CannaQuest Telehealth Hub",
      bookDate: "12 Apr 2026",
      startTime: "10:15 AM",
      canJoin: false,
      type: "Video Telehealth Call",
      summary: "Patient reported 60% reduction in nocturnal neuropathic discomfort. Prescribed Sativite Okanagan flower & Althea CBD oil."
    },
    {
      id: "CONS-1044",
      prescriberName: "Dr. Emily Chen",
      prescriberTitle: "Clinical Assessor",
      clinicName: "CannaQuest Clinic Melbourne",
      bookDate: "18 Jan 2026",
      startTime: "3:00 PM",
      canJoin: false,
      type: "Initial Eligibility Consult",
      summary: "Approved for plant-based medical cannabinoid therapy under Special Access Scheme Category B."
    }
  ],

  orders: [
    {
      id: 101,
      uuid: "CQ-88294-AU",
      createdAt: "Yesterday, 2:15 PM",
      totalAmount: 150.00,
      status: "In Transit",
      statusColor: "emerald",
      shippingSummary: "Express Courier • Consignment AP-982173491AU",
      items: [
        {
          id: "item-1",
          name: "Sativite Okanagan 19%",
          form: "Flower",
          strength: "19% THC",
          quantity: 1,
          price: 135.00
        }
      ],
      progressSteps: [
        { name: "Order Placed", status: "completed" },
        { name: "Pharmacy Verified", status: "completed" },
        { name: "In Transit", status: "current" },
        { name: "Delivered", status: "pending" }
      ],
      deliveryAddress: "Unit 4, 128 Crown Street, Surry Hills NSW 2010",
      paymentMethod: "Credit Card (ending ••42)"
    },
    {
      id: 100,
      uuid: "CQ-74102-AU",
      createdAt: "18 Sep 2026",
      totalAmount: 310.00,
      status: "Delivered",
      statusColor: "emerald",
      shippingSummary: "Delivered to safe locker on 20 Sep 2026",
      items: [
        {
          id: "item-2",
          name: "Althea CBD100 Oral Liquid",
          form: "Oil",
          strength: "100mg/mL CBD",
          quantity: 1,
          price: 160.00
        },
        {
          id: "item-3",
          name: "Cannatrek T25 Topaz",
          form: "Flower",
          strength: "25% THC",
          quantity: 1,
          price: 145.00
        }
      ],
      progressSteps: [
        { name: "Order Placed", status: "completed" },
        { name: "Pharmacy Verified", status: "completed" },
        { name: "In Transit", status: "completed" },
        { name: "Delivered", status: "completed" }
      ],
      deliveryAddress: "Unit 4, 128 Crown Street, Surry Hills NSW 2010",
      paymentMethod: "PayID (Instant Clearance)"
    }
  ],

  documents: [
    {
      id: "doc-1",
      title: "Comprehensive Treatment Plan",
      uploadedAt: "12 Apr 2026",
      fileType: "PDF",
      doctor: "Dr. Lachlan Vance",
      fileUrl: "#",
      size: "2.4 MB"
    },
    {
      id: "doc-2",
      title: "TGA SAS-B Approval Certificate",
      uploadedAt: "18 Jan 2026",
      fileType: "PDF",
      doctor: "Therapeutic Goods Administration",
      fileUrl: "#",
      size: "840 KB"
    },
    {
      id: "doc-3",
      title: "Patient Rights & Consent Form",
      uploadedAt: "18 Jan 2026",
      fileType: "PDF",
      doctor: "CannaQuest Telehealth",
      fileUrl: "#",
      size: "410 KB"
    }
  ],

  notifications: [
    {
      id: "notif-1",
      title: "Prescription Refill Ready",
      description: "Sativite Okanagan 19% repeat 3 of 5 is available for immediate reorder.",
      time: "10m ago",
      read: false,
      type: "script"
    },
    {
      id: "notif-2",
      title: "Upcoming Telehealth Consult",
      description: "Video consultation tomorrow at 2:30 PM with Dr. Lachlan Vance.",
      time: "2h ago",
      read: false,
      type: "consult"
    },
    {
      id: "notif-3",
      title: "Order Dispatched",
      description: "Order CQ-88294-AU is in transit with Express Courier.",
      time: "Yesterday",
      read: true,
      type: "order"
    }
  ]
};
