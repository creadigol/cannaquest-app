export type MedicineForm = 'flower' | 'oil' | 'cartridge' | 'device' | 'capsule' | 'topical' | string;

export type Product = {
  id: number | string;
  name: string;
  description?: string | null;
  form?: MedicineForm | null;
  category?: string | null;
  dosage?: string | null;
  unit?: string | null;
  manufacturer?: string | null;
  strength?: string | null;
  package_size?: string | null;
  packageSize?: string | null;
  package_amount?: number | null;
  packageAmount?: number | null;
  package_unit?: string | null;
  packageUnit?: string | null;
  thc_content?: string | null;
  thcContent?: string | null;
  cbd_content?: string | null;
  cbdContent?: string | null;
  unit_price?: number | null;
  unitPrice?: number | null;
  retail_price?: number | null;
  retailPrice?: number | null;
  price?: number | null;
  in_stock?: boolean;
  inStock?: boolean;
  image_url?: string | null;
  imageUrl?: string | null;
  image?: string | null;
  is_addon_device?: boolean;
  isAddonDevice?: boolean;
  addon_for_form?: string | null;
  addonForForm?: string | null;
  prescription_free?: boolean;
  prescriptionFree?: boolean;
  // Prescription eligibility indicators
  prescribed?: boolean;
  can_purchase?: boolean;
  needs_renewal?: boolean;
  prescription_id?: number | string | null;
};

export type ProductListParams = {
  category?: string;
  search?: string;
};
