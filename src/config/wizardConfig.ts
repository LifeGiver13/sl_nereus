
export interface WizardField {
  label: string;
  type: 'text' | 'email' | 'tel' | 'password' | 'select' | 'boolean' | 'file' | 'textArea' | 'date' | 'agreement';
  name: string;
  options?: string[];
  default?: string;
  required: boolean;
  value: string;
  booleanValue?: string;
  size?: number;
  ext?: string;
  fileName?: string;
  forceYes?: boolean;
  condition?: {
    field: string;
    value: string | string[];
    operator?: string;
    action?: string;
    validate: boolean;
  };
  checkableExtraLabel?: string;
  checkableExtraValue?: boolean;
}

export interface WizardSection {
  title: string;
  description: string;
  fields?: WizardField[];
  skills?: any[];
  history?: WizardField[][];
  references?: WizardField[][];
}

export interface WizardFormConfig {
  [key: string]: WizardSection;
}

export const PreRegistrationWizard: WizardFormConfig = {
  'personal-info': {
    title: 'Personal Information',
    description: 'Provide your personal information',
    fields: [
      {
        label: 'Title',
        type: 'select',
        name: 'ctitle',
        options: ['Mr', 'Mrs'],
        default: 'Mr',
        required: true,
        value: '',
      },
      {
        label: 'First name',
        type: 'text',
        name: 'firstName',
        required: true,
        value: '',
      },
      {
        label: 'Middle Name',
        type: 'text',
        name: 'middleName',
        required: false,
        value: ''
      },
      {
        label: 'Last name',
        type: 'text',
        name: 'lastName',
        required: true,
        value: ''
      },
      {
        label: 'Email',
        type: 'email',
        name: 'username',
        required: true,
        value: ''
      },
      {
        label: 'Phone Number',
        type: 'tel',
        name: 'phoneNumber',
        required: true,
        value: '',
      },
      {
        label: 'Accept Terms and Conditions',
        type: 'boolean',
        name: 'termsAndConditions',
        required: true,
        forceYes: true,
        value: ''
      }
    ]
  },
  'contact-info': {
    title: 'Contact Information',
    description: 'Provide your personal information',
    fields: [
      {
        label: 'LinkedIn profile',
        type: 'text',
        name: 'linkedIn',
        required: false,
        value: ''
      },
      {
        label: 'Upload CV',
        type: 'file',
        name: 'uploadCV',
        required: true,
        size: 0,
        ext: '',
        value: '',
        fileName: ''
      },
      {
        label: 'Brief description of what you are looking for',
        type: 'textArea',
        name: 'briefDescription',
        required: true,
        value: ''
      },
      {
        label: 'Eligible to work in the UK',
        type: 'boolean',
        name: 'eligibleToWorkInUK',
        required: true,
        value: "",
      },
      {
        label: 'Are you a British citizen?',
        type: 'boolean',
        name: 'isBritishCitizen',
        required: true,
        value: '',
        condition: {
          field: 'eligibleToWorkInUK',
          value: 'true',
          validate: false
        }
      },
      {
        label: 'Document Type',
        type: 'select',
        name: 'documentType',
        options: ['Birth Certificate (Full)', 'Passport', 'NI Number (P45, P60, Tax Letter)'],
        condition: {
          field: 'isBritishCitizen',
          value: 'true',
          validate: false
        },
        required: true,
        value: ''
      },
      {
        label: 'Upload Document',
        type: 'file',
        name: 'britishDocument',
        required: true,
        condition: {
          field: 'documentType',
          value: ['Birth Certificate (Full)', 'Passport', 'NI Number (P45, P60, Tax Letter)'],
          validate: false
        },
        size: 0,
        ext: '',
        value: '',
        fileName: ''
      },
      {
        label: 'Right to Work Share Code',
        type: 'text',
        name: 'shareCode',
        condition: {
          field: 'isBritishCitizen',
          value: 'false',
          validate: false
        },
        required: true,
        value: ''
      }
    ]
  },
  'profile-security': {
    title: 'Profile Security',
    description: 'Set a password for your account.',
    fields: [
      {
        label: 'Password',
        type: 'password',
        name: 'password',
        required: true,
        value: ''
      },
      {
        label: 'Confirm Password',
        type: 'password',
        name: 'confirmPassword',
        required: true,
        value: ''
      }
    ]
  },
};

export const PostRegistrationWizard: WizardFormConfig = {
  'profile-information': {
    title: 'Profile Information',
    description: 'Set a password for your account.',
    fields: [
      {
        label: 'Minimum Pay Rate (per hour)',
        type: 'text',
        name: 'minimumPay',
        required: true,
        value: ''
      },
      {
        label: 'Valid Driving License',
        type: 'boolean',
        name: 'validDrivingLicense',
        required: false,
        value: ''
      },
      {
        label: 'Valid DBS',
        type: 'text',
        name: 'validDBS',
        required: false,
        value: '',
        booleanValue: ''
      },
      {
        label: 'Vehicle Owner',
        type: 'boolean',
        name: 'vehicleOwner',
        required: false,
        value: ''
      },
      {
        label: 'Skills and Qualifications',
        type: 'select',
        name: 'skillsAndQualifications',
        options: ['Engineering', 'Automobile'],
        required: true,
        value: '',
      },
      {
        label: 'New Starter Declaration',
        type: 'boolean',
        name: 'newStarterDeclaration',
        required: false,
        value: ''
      },
      {
        label: 'P45 Upload',
        type: 'file',
        name: 'p45Upload',
        required: false,
        size: 0,
        ext: '',
        value: '',
        fileName: ''
      },
      {
        label: 'Student Loan Repayments',
        type: 'boolean',
        name: 'studentLoanRepayments',
        required: false,
        value: ''
      },
      {
        label: 'Data Protection Consent Form',
        type: 'boolean',
        name: 'dataProtectionConsentForm',
        required: true,
        value: ''
      },
      {
        label: 'Benefits/Second Job Statement',
        type: 'boolean',
        name: 'benefitsJobStatement',
        required: false,
        value: ''
      },
      {
        label: 'Candidate Declaration',
        type: 'boolean',
        name: 'candidateDeclaration',
        required: true,
        value: ''
      },
    ]
  },
  'skills-information': {
    title: 'Skills Information',
    description: 'Select your skills and qualifications',
    skills: []
  },
  'employment-information': {
    title: 'Employment Information',
    description: 'Set a password for your account.',
    history: [
      [
        {
          label: 'Job Title',
          type: 'text',
          name: 'jobTitle',
          required: true,
          value: ''
        },
        {
          label: 'Company',
          type: 'text',
          name: 'company',
          required: true,
          value: ''
        },
        {
          label: 'Start date',
          type: 'date',
          name: 'startDate',
          required: true,
          value: ''
        },
        {
          label: 'End date',
          type: 'date',
          name: 'endDate',
          required: true,
          value: '',
          checkableExtraLabel: 'I am still in this job',
          checkableExtraValue: false
        },
        {
          label: 'Job Description',
          type: 'textArea',
          name: 'jobDescription',
          required: false,
          value: ''
        }
      ]
    ],
    references: [
      [
        {
          label: 'Name',
          type: 'text',
          name: 'name',
          required: true,
          value: ''
        },
        {
          label: 'Position',
          type: 'text',
          name: 'position',
          required: true,
          value: ''
        },
        {
          label: 'Relationship',
          type: 'text',
          name: 'relationship',
          required: true,
          value: ''
        },
        {
          label: 'Email',
          type: 'text',
          name: 'email',
          required: true,
          value: ''
        },
        {
          label: 'Contact Number',
          type: 'text',
          name: 'contactNumber',
          required: true,
          value: ''
        },
        {
          label: 'Postal Address',
          type: 'text',
          name: 'postalAddress',
          required: true,
          value: ''
        }
      ]
    ]
  },
  'immigration-info': {
    title: 'Immigration Information',
    description: 'Provide Your Immigration Information',
    fields: [
      {
        label: 'Nationality at birth',
        type: 'select',
        name: 'birthNationality',
        options: ['United Kingdom', 'Other'],
        required: true,
        value: '',
        booleanValue: "",
      },
      {
        label: 'Current Nationality',
        type: 'select',
        name: 'currentNationality',
        options: ['United Kingdom', 'Other'],
        required: true,
        value: '',
        booleanValue: ""
      },
      {
        label: 'Any other nationalities?',
        type: 'select',
        name: 'otherNationalities',
        required: false,
        value: '',
        booleanValue: "",
        options: ['United Kingdom', 'Other'],
      },
      {
        label: 'Employment restrictions?',
        type: 'text',
        name: 'employmentRestrictions',
        required: false,
        value: '',
        booleanValue: "",
      },
      {
        label: 'Residency restrictions',
        type: 'text',
        name: 'residencyRestrictions',
        required: false,
        value: '',
        booleanValue: "",
      },
      {
        label: 'Immigration Control?',
        type: 'text',
        name: 'immigrationControl',
        required: false,
        value: '',
        booleanValue: "",
      },
      {
        label: 'Lawful resident?',
        type: 'text',
        name: 'lawfulResident',
        required: false,
        value: '',
        booleanValue: "",
      },
      {
        label: 'Home office/Port Reference',
        type: 'text',
        name: 'homeOfficePortReference',
        required: false,
        value: '',
        booleanValue: "",
      },
      {
        label: 'Unspent Convictions',
        type: 'text',
        name: 'unspentConvictions',
        required: false,
        value: '',
        booleanValue: "",
      },
      {
        label: 'Right to work',
        type: 'agreement',
        name: 'rightToWorkAgreement',
        required: true,
        value: '',
        booleanValue: "",
      },
      {
        label: 'Health and Safety',
        type: 'boolean',
        name: 'healthAndSafety',
        required: true,
        value: '',
        booleanValue: "",
      },
      {
        label: 'Rehabilitation of offenders Act 1974',
        type: 'agreement',
        name: 'rehabilitationAct',
        required: true,
        value: '',
        booleanValue: "",
      },
      {
        label: 'Agency Worker Regulations (2010)',
        type: 'boolean',
        name: 'agencyWorkerRegulations',
        required: true,
        value: '',
        booleanValue: "",
      },
      {
        label: 'Working Time Regulations',
        type: 'boolean',
        name: 'workingTimeRegulations',
        required: true,
        value: '',
        booleanValue: "",
      },
    ]
  },
  'payment-information': {
    title: 'Payment Information',
    description: 'Provide Your Payment Information',
    fields: [
      {
        label: 'Bank Name',
        type: 'text',
        name: 'bankName',
        required: true,
        value: ''
      },
      {
        label: "Account Holder's Name",
        type: 'text',
        name: 'accountHolderName',
        required: true,
        value: ''
      },
      {
        label: 'Account Number',
        type: 'text',
        name: 'accountNumber',
        required: true,
        value: ''
      },
      {
        label: 'Sort Code',
        type: 'text',
        name: 'sortCode',
        required: true,
        value: ''
      }
    ]
  },
};
