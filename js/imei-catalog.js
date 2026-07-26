// ========================================
// CATÁLOGO PÚBLICO DE CHEQUEOS DE IMEI
// Mantené el "price" sincronizado con la función imei-check
// (cost * MARKUP, con piso de $0.05) cada vez que cambies el margen.
// ========================================
window.IMEI_CATALOG = [
  // ---- APPLE ----
  { slug: "apple_serial_info",       name: "Apple - Info de serie",                  price: 0.05, category: "Apple" },
  { slug: "icloud_on_off",           name: "iCloud ON/OFF",                          price: 0.05, category: "Apple" },
  { slug: "apple_activation_status", name: "Apple - Estado de activación",           price: 0.05, category: "Apple" },
  { slug: "apple_activation_pro",    name: "Apple - Estado de activación PRO",       price: 0.06, category: "Apple" },
  { slug: "iphone_carrier",          name: "iPhone - Operadora (Carrier)",           price: 0.09, category: "Apple" },
  { slug: "iphone_carrier_fmi",      name: "iPhone - Carrier & FMI",                 price: 0.12, category: "Apple" },
  { slug: "iphone_carrier_fmi_bl",   name: "iPhone - Carrier & FMI & Blacklist",     price: 0.15, category: "Apple" },
  { slug: "apple_gsx_repair_elig",   name: "Apple GSX - Elegibilidad de reparación", price: 0.21, category: "Apple" },
  { slug: "apple_part_number",       name: "Apple - Número de parte (MPN)",          price: 0.23, category: "Apple" },
  { slug: "apple_demo_devices",      name: "Apple - Info dispositivos demo",         price: 0.30, category: "Apple" },
  { slug: "macbook_imac_icloud",     name: "MacBook/iMac - iCloud ON/OFF",           price: 0.30, category: "Apple" },
  { slug: "iphone_mac_icloud_clean", name: "iPhone/Mac - iCloud Clean/Lost",         price: 0.33, category: "Apple" },
  { slug: "apple_mdm_icloud_status", name: "Apple - MDM & iCloud",                   price: 0.36, category: "Apple" },
  { slug: "iphone_carrier_fmi_bl_s2",name: "iPhone - Carrier & FMI & Blacklist S2",  price: 0.38, category: "Apple" },
  { slug: "apple_mdm_status",        name: "Apple - Estado MDM",                     price: 0.45, category: "Apple" },
  { slug: "apple_carrier_mdm_icloud",name: "Apple - Carrier + MDM + iCloud + GSX",   price: 0.60, category: "Apple" },
  { slug: "apple_replacements",      name: "Apple - Historial de reemplazos",        price: 1.05, category: "Apple" },
  { slug: "apple_gsx_promo",         name: "Apple GSX Premium - Promo",              price: 1.20, category: "Apple" },
  { slug: "apple_gsx_cases",         name: "Apple GSX - Casos y reparaciones",       price: 1.80, category: "Apple" },
  { slug: "apple_sold_country",      name: "Apple - Vendido por & país",             price: 2.70, category: "Apple" },
  { slug: "apple_gsx_premium",       name: "Apple GSX Premium Details",              price: 3.00, category: "Apple" },
  { slug: "iphone_model_color_cap",  name: "iPhone - Modelo, color y capacidad",     price: 0.05, category: "Apple" },
  { slug: "imei_sn_convert",         name: "IMEI ⇄ SN Convert",                      price: 0.05, category: "Apple" },

  // ---- ESTADOS / BLACKLIST ----
  { slug: "att_status_unlock",    name: "AT&T USA - Estado & Unlock",   price: 0.60, category: "Estados" },
  { slug: "cricket_status_pro",   name: "Cricket USA - Estado PRO",     price: 0.23, category: "Estados" },
  { slug: "verizon_status_pro",   name: "Verizon USA - Estado PRO",     price: 0.11, category: "Estados" },
  { slug: "xfinity_status_pro",   name: "Xfinity USA - Estado PRO",     price: 0.12, category: "Estados" },
  { slug: "cspire_status_pro",    name: "C Spire USA - Estado PRO",     price: 0.12, category: "Estados" },
  { slug: "tracfone_status_pro",  name: "Tracfone USA - Estado PRO",    price: 0.09, category: "Estados" },
  { slug: "tmobile_status_pro",   name: "T-Mobile USA - Estado PRO",    price: 0.08, category: "Estados" },
  { slug: "ww_blacklist_pro",     name: "Blacklist mundial PRO",        price: 0.18, category: "Estados" },
  { slug: "ww_blacklist",         name: "Blacklist mundial",            price: 0.06, category: "Estados" },
  { slug: "brazil_blacklist",     name: "Blacklist Brasil",             price: 0.14, category: "Estados" },
  { slug: "japan_blacklist",      name: "Blacklist Japón",              price: 0.12, category: "Estados" },
  { slug: "korea_blacklist",      name: "Blacklist Corea",              price: 0.05, category: "Estados" },
  { slug: "australia_blacklist",  name: "Blacklist Australia",          price: 0.05, category: "Estados" },

  // ---- MARCAS ----
  { slug: "samsung_info",             name: "Samsung - Info",                        price: 0.09, category: "Marcas" },
  { slug: "samsung_info_pro",         name: "Samsung - Info PRO",                    price: 0.15, category: "Marcas" },
  { slug: "samsung_knox_guard",       name: "Samsung Knox Guard - Info",             price: 0.45, category: "Marcas" },
  { slug: "motorola_info",            name: "Motorola - Info",                       price: 0.12, category: "Marcas" },
  { slug: "huawei_info",              name: "Huawei - Info",                         price: 0.15, category: "Marcas" },
  { slug: "google_pixel_info",        name: "Google Pixel - Info",                   price: 0.18, category: "Marcas" },
  { slug: "oppo_oneplus_realme",      name: "Oppo/OnePlus/Realme - Info",            price: 0.30, category: "Marcas" },
  { slug: "vivo_iqoo_info",           name: "Vivo/iQOO - Info",                      price: 0.05, category: "Marcas" },
  { slug: "xiaomi_milock_onoff",      name: "Xiaomi/Redmi/Poco - Mi Lock ON/OFF",    price: 0.15, category: "Marcas" },
  { slug: "xiaomi_milock_clean",      name: "Xiaomi/Redmi/Poco - Mi Lock Clean/Lost",price: 0.75, category: "Marcas" },
  { slug: "zte_nubia_redmagic",       name: "ZTE/Nubia/RedMagic - Info",             price: 0.08, category: "Marcas" },
  { slug: "itel_infinix_tecno_sonim", name: "Itel/Infinix/Tecno/Sonim - Info",       price: 0.05, category: "Marcas" },
  { slug: "honor_info",               name: "Honor - Info",                          price: 0.12, category: "Marcas" },
  { slug: "nothing_phone_info",       name: "Nothing Phone - Info",                  price: 0.05, category: "Marcas" },
  { slug: "lenovo_info",              name: "Lenovo - Info",                         price: 0.09, category: "Marcas" },
  { slug: "alcatel_info",             name: "Alcatel - Info",                        price: 0.15, category: "Marcas" },
  { slug: "asus_info",                name: "Asus - Info",                           price: 0.09, category: "Marcas" },
  { slug: "acer_info",                name: "Acer - Info",                           price: 0.09, category: "Marcas" },
  { slug: "kyocera_info",             name: "Kyocera - Info",                        price: 0.08, category: "Marcas" },
  { slug: "doogee_info",              name: "Doogee - Info",                         price: 0.08, category: "Marcas" },
  { slug: "sparx_info",               name: "Sparx - Info",                          price: 0.05, category: "Marcas" },
  { slug: "unity_cellecor_info",      name: "Unity Cellecor - Info",                 price: 0.05, category: "Marcas" },

  // ---- OTROS ----
  { slug: "brand_model_info", name: "Marca y modelo - Info",     price: 0.05, category: "Otros" },
  { slug: "sim_iccid_imsi",   name: "SIM ICCID/IMSI - Info",     price: 0.05, category: "Otros" },
];
