// Liste complète des villes et villages de la Mauritanie avec distances depuis Nouakchott (en km)
export interface City {
  name: string;
  nameAr: string;
  distance: number;
  region: string;
}

export const MAURITANIA_CITIES: City[] = [
  // Nouakchott (capitale)
  { name: 'Nouakchott', nameAr: 'نواكشوط', distance: 0, region: 'Nouakchott' },
  
  // Région du Trarza
  { name: 'Rosso', nameAr: 'روصو', distance: 203, region: 'Trarza' },
  { name: 'Boutilimit', nameAr: 'بوتلميت', distance: 164, region: 'Trarza' },
  { name: 'Rkiz', nameAr: 'ركيز', distance: 140, region: 'Trarza' },
  { name: 'Mederdra', nameAr: 'ميدردرة', distance: 175, region: 'Trarza' },
  { name: 'Keur Macène', nameAr: 'كير ماسين', distance: 158, region: 'Trarza' },
  { name: 'Lekseiba', nameAr: 'لكصيبة', distance: 185, region: 'Trarza' },
  { name: 'Ouad Naga', nameAr: 'واد الناقة', distance: 35, region: 'Trarza' },
  { name: 'Tevragh Zeina', nameAr: 'تفرغ زينة', distance: 5, region: 'Trarza' },
  { name: 'Arafat', nameAr: 'عرفات', distance: 8, region: 'Trarza' },
  
  // Région du Brakna
  { name: 'Aleg', nameAr: 'ألاك', distance: 250, region: 'Brakna' },
  { name: 'Boghé', nameAr: 'بوكى', distance: 285, region: 'Brakna' },
  { name: 'Boumdeid', nameAr: 'بومديد', distance: 320, region: 'Brakna' },
  { name: 'Bababé', nameAr: 'بابابى', distance: 270, region: 'Brakna' },
  { name: 'Magta Lahjar', nameAr: 'مقطع الحجار', distance: 220, region: 'Brakna' },
  { name: 'M\'Bagne', nameAr: 'مباني', distance: 245, region: 'Brakna' },
  { name: 'Dar El Barka', nameAr: 'دار البركة', distance: 195, region: 'Brakna' },
  
  // Région du Gorgol
  { name: 'Kaédi', nameAr: 'كيهيدي', distance: 435, region: 'Gorgol' },
  { name: 'Sélibaby', nameAr: 'سليبابي', distance: 615, region: 'Gorgol' },
  { name: 'Monguel', nameAr: 'منكيل', distance: 485, region: 'Gorgol' },
  { name: 'Lexeiba', nameAr: 'لكصيبة', distance: 450, region: 'Gorgol' },
  { name: 'M\'Bout', nameAr: 'مبوت', distance: 520, region: 'Gorgol' },
  { name: 'Ould Yengé', nameAr: 'ولد ينجي', distance: 498, region: 'Gorgol' },
  
  // Région de l\'Assaba
  { name: 'Kiffa', nameAr: 'كيفة', distance: 620, region: 'Assaba' },
  { name: 'Guerou', nameAr: 'كرو', distance: 545, region: 'Assaba' },
  { name: 'Barkéol', nameAr: 'بركيول', distance: 680, region: 'Assaba' },
  { name: 'Bougadoum', nameAr: 'بوكادوم', distance: 570, region: 'Assaba' },
  { name: 'Bouanze', nameAr: 'بوأنزه', distance: 635, region: 'Assaba' },
  
  // Région du Guidimaka
  { name: 'Sintiou Bamambe', nameAr: 'سينتيو بامامب', distance: 672, region: 'Guidimaka' },
  
  // Région du Hodh Ech Chargui
  { name: 'Néma', nameAr: 'النعمة', distance: 1180, region: 'Hodh Ech Chargui' },
  { name: 'Oualata', nameAr: 'ولاتة', distance: 1285, region: 'Hodh Ech Chargui' },
  { name: 'Amourj', nameAr: 'أمورج', distance: 1220, region: 'Hodh Ech Chargui' },
  { name: 'Bassiknou', nameAr: 'باسكنو', distance: 1150, region: 'Hodh Ech Chargui' },
  { name: 'Djiguenni', nameAr: 'جيجني', distance: 1135, region: 'Hodh Ech Chargui' },
  
  // Région du Hodh El Gharbi
  { name: 'Ayoun el Atrous', nameAr: 'العيون', distance: 945, region: 'Hodh El Gharbi' },
  { name: 'Kobenni', nameAr: 'كوبني', distance: 1020, region: 'Hodh El Gharbi' },
  { name: 'Tamchekett', nameAr: 'تمشكط', distance: 875, region: 'Hodh El Gharbi' },
  { name: 'Timbedra', nameAr: 'تمبدغة', distance: 1120, region: 'Hodh El Gharbi' },
  
  // Région de l\'Adrar
  { name: 'Atar', nameAr: 'أطار', distance: 470, region: 'Adrar' },
  { name: 'Chinguetti', nameAr: 'شنقيط', distance: 540, region: 'Adrar' },
  { name: 'Ouadane', nameAr: 'وادان', distance: 530, region: 'Adrar' },
  { name: 'Tidjikja', nameAr: 'تجنكج', distance: 535, region: 'Adrar' },
  { name: 'Aoujeft', nameAr: 'أوجفت', distance: 495, region: 'Adrar' },
  
  // Région du Tagant
  { name: 'Tichitt', nameAr: 'تيشيت', distance: 625, region: 'Tagant' },
  { name: 'Rachid', nameAr: 'رشيد', distance: 595, region: 'Tagant' },
  
  // Région de l\'Inchiri
  { name: 'Akjoujt', nameAr: 'أكجوجت', distance: 250, region: 'Inchiri' },
  { name: 'El Aioun', nameAr: 'العيون', distance: 290, region: 'Inchiri' },
  
  // Région de Dakhlet Nouadhibou
  { name: 'Nouadhibou', nameAr: 'نواذيبو', distance: 470, region: 'Dakhlet Nouadhibou' },
  { name: 'Chami', nameAr: 'شامي', distance: 420, region: 'Dakhlet Nouadhibou' },
  { name: 'Iwik', nameAr: 'إويك', distance: 510, region: 'Dakhlet Nouadhibou' },
  
  // Région du Tiris Zemmour
  { name: 'F\'Derik', nameAr: 'افديرك', distance: 710, region: 'Tiris Zemmour' },
  { name: 'Zouérat', nameAr: 'زويرات', distance: 680, region: 'Tiris Zemmour' },
  { name: 'Bir Moghrein', nameAr: 'بير أمغرين', distance: 815, region: 'Tiris Zemmour' },
  
  // Autres villes importantes
  { name: 'Rosso-Sénégal', nameAr: 'روصو-السنغال', distance: 203, region: 'Trarza' },
  { name: 'Mal', nameAr: 'مال', distance: 180, region: 'Trarza' },
  { name: 'R\'Kiz', nameAr: 'ركيز', distance: 140, region: 'Trarza' },
  { name: 'Maghama', nameAr: 'مغامة', distance: 295, region: 'Gorgol' },
  { name: 'Kankossa', nameAr: 'كانكوسا', distance: 555, region: 'Assaba' },
  { name: 'Ten Hamadi', nameAr: 'تين حمدي', distance: 485, region: 'Brakna' },
];

// Fonction pour obtenir les villes triées par nom, en supprimant les doublons
export const getCitiesSorted = (): City[] => {
  const uniqueCities = new Map<string, City>();
  
  // Garder la première occurrence de chaque ville (par nom)
  MAURITANIA_CITIES.forEach(city => {
    const key = city.name.toLowerCase();
    if (!uniqueCities.has(key)) {
      uniqueCities.set(key, city);
    }
  });
  
  return Array.from(uniqueCities.values()).sort((a, b) => a.name.localeCompare(b.name));
};

// Fonction pour obtenir les villes par région
export const getCitiesByRegion = (): Record<string, City[]> => {
  const grouped: Record<string, City[]> = {};
  MAURITANIA_CITIES.forEach(city => {
    if (!grouped[city.region]) {
      grouped[city.region] = [];
    }
    grouped[city.region].push(city);
  });
  return grouped;
};

// Fonction pour trouver une ville par nom
export const findCityByName = (name: string): City | undefined => {
  return MAURITANIA_CITIES.find(
    city => city.name.toLowerCase() === name.toLowerCase() || 
            city.nameAr === name
  );
};

// Fonction pour calculer la distance entre deux villes
export const calculateDistance = (from: string, to: string): number => {
  const fromCity = findCityByName(from);
  const toCity = findCityByName(to);
  
  if (!fromCity || !toCity) {
    return 0;
  }
  
  // Distance absolue (simplification - en réalité, on devrait calculer le trajet réel)
  return Math.abs(toCity.distance - fromCity.distance);
};

