const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { all, get, run } = require('../config/database');
const env = require('../config/env');
const { ensureDir, fileChecksum } = require('../utils/storage');
const notificationService = require('./notificationService');

const FONT_FR = path.join(__dirname, '../assets/fonts/HeiseiKakuGo-W5.ttf');
const FONT_AR = path.join(__dirname, '../assets/fonts/HYSMyeongJo-Medium.ttf');
const LOGO_LEFT = path.join(__dirname, '../assets/images/ANESP.png');
const LOGO_RIGHT = path.join(__dirname, '../assets/images/mauritania-coat-of-arms.png');
const SLOGAN = path.join(__dirname, '../assets/images/slogan_rim.png');
const AGENCY_LOGO = path.join(__dirname, '../assets/images/anetat.png');
const COAT_OF_ARMS = path.join(__dirname, '../assets/images/mauritania-coat-of-arms.png');
const STAMP_ANESP = path.join(__dirname, '../assets/images/an.png');
const SIGNATURE_DG = path.join(__dirname, '../assets/images/signatures/signature.jpg');

function getFont(doc, language) {
  const fontPath = language === 'ar' ? FONT_AR : FONT_FR;
  if (fs.existsSync(fontPath)) {
    doc.font(fontPath);
  } else {
    doc.font(language === 'ar' ? 'Times-Roman' : 'Helvetica');
  }
}

function formatArabic(text) {
  if (!text) return '';
  return text.split('').reverse().join('');
}

function translate(textFr, textAr, language) {
  return language === 'ar' ? textAr : textFr;
}

function renderArabicText(doc, baseLanguage, size, text, options = {}) {
  const previousSize = doc._fontSize;
  const previousDirection = doc.direction;
  if (typeof size === 'number') {
    doc.fontSize(size);
  }
  doc.direction = 'rtl';
  getFont(doc, 'ar');
  doc.text(text, options);
  doc.fontSize(previousSize);
  doc.direction = previousDirection;
  getFont(doc, baseLanguage);
}

function drawHeader(doc, mission, language) {
  const startY = doc.y;
  const logoOptions = { width: 70 };
  if (fs.existsSync(LOGO_LEFT)) {
    doc.image(LOGO_LEFT, 40, startY, logoOptions);
  }
  if (fs.existsSync(LOGO_RIGHT)) {
    const rightX = doc.page.width - 40 - logoOptions.width;
    doc.image(LOGO_RIGHT, rightX, startY, logoOptions);
  }
  doc.moveDown(2);
  if (fs.existsSync(SLOGAN)) {
    const x = doc.page.width / 2 - 90;
    doc.image(SLOGAN, x, doc.y, { width: 180 });
    doc.moveDown();
  }
  doc.fontSize(18).text(translate('République Islamique de Mauritanie', 'الجمهورية الإسلامية الموريتانية', language), {
    align: language === 'ar' ? 'right' : 'left'
  });
  doc.moveDown(0.4);
  doc.fontSize(14).text(translate('Agence Nationale d’Exécution et de Suivi des Projets', 'الوكالة الوطنية لتنفيذ ومتابعة المشاريع', language), {
    align: language === 'ar' ? 'right' : 'left'
  });
  doc.moveDown(0.8);
  doc.fontSize(16).text(
    translate('Ordre de mission', 'أمر بمهمة', language),
    { align: 'center', underline: true }
  );
  doc.moveDown();
  const referenceLabel = translate('Référence', 'المرجع', language);
  const periodLabel = translate('Période', 'الفترة', language);
  const objectiveLabel = translate('Objet', 'الموضوع', language);
  doc.fontSize(12);
  doc.text(`${referenceLabel}: ${mission.reference}`, { align: language === 'ar' ? 'right' : 'left' });
  doc.text(`${periodLabel}: ${mission.start_date} → ${mission.end_date}`, { align: language === 'ar' ? 'right' : 'left' });
  doc.text(`${objectiveLabel}: ${mission.title}`, { align: language === 'ar' ? 'right' : 'left' });
  doc.moveDown();
}

function drawDestinations(doc, mission, language) {
  const heading = translate('Itinéraire détaillé', 'خط سير المهمة', language);
  doc.fontSize(13).text(heading, { bold: true });
  doc.moveDown(0.3);
  mission.destinations.forEach((destination, index) => {
    const label = `${index + 1}. ${destination.city} - ${destination.distance_km} km`;
    doc.fontSize(11).text(language === 'ar' ? formatArabic(label) : label, { align: language === 'ar' ? 'right' : 'left' });
  });
  doc.moveDown();
}

function drawParticipants(doc, mission, language) {
  const heading = translate('Participants', 'المشاركون', language);
  doc.fontSize(13).text(heading);
  doc.moveDown(0.3);
  mission.participants.forEach((participant) => {
    let line = '';
    if (participant.participant_type === 'internal') {
      line = translate('Agent interne', 'موظف داخلي', language) + `: ${participant.internal_name}`;
    } else {
      line = `${participant.first_name || ''} ${participant.last_name || ''} - ${participant.profession || ''}`;
    }
    doc.fontSize(11).text(language === 'ar' ? formatArabic(line) : line, { align: language === 'ar' ? 'right' : 'left' });
  });
  doc.moveDown();
}

function drawLogistics(doc, mission, language) {
  const heading = translate('Logistique & dotations', 'اللوجستيك والاعتمادات', language);
  doc.fontSize(13).text(heading);
  doc.moveDown(0.3);
  const lines = [
    `${translate('Mode de transport', 'وسيلة النقل', language)}: ${mission.transport_mode}`,
    `${translate('Carburant estimé', 'الوقود المقدر', language)}: ${mission.fuel_estimate} L`,
    `${translate('Indemnités journalières', 'التعويضات اليومية', language)}: ${mission.per_diem_total} MRU`
  ];
  if (mission.logistics) {
    if (mission.logistics.vehicle_label) {
      lines.push(
        `${translate('Véhicule', 'المركبة', language)}: ${mission.logistics.vehicle_label} (${mission.logistics.registration || '-'})`
      );
    }
    if (mission.logistics.driver_first_name) {
      lines.push(
        `${translate('Chauffeur', 'السائق', language)}: ${mission.logistics.driver_first_name} ${mission.logistics.driver_last_name || ''}`
      );
    }
    if (mission.logistics.lodging_details) {
      lines.push(`${translate('Hébergement', 'الإقامة', language)}: ${mission.logistics.lodging_details}`);
    }
    if (mission.logistics.tickets_details) {
      lines.push(`${translate('Billets', 'تذاكر السفر', language)}: ${mission.logistics.tickets_details}`);
    }
  }
  lines.forEach((line) => {
    doc.fontSize(11).text(language === 'ar' ? formatArabic(line) : line, { align: language === 'ar' ? 'right' : 'left' });
  });
  doc.moveDown();
}

function drawFooter(doc, language) {
  doc.moveDown(2);
  const signatureLabel = translate('Directeur Général', 'المدير العام', language);
  if (fs.existsSync(SIGNATURE_DG)) {
    const x = language === 'ar' ? doc.page.width - 180 : 60;
    doc.image(SIGNATURE_DG, x, doc.y, { width: 120 });
    doc.moveDown(1.5);
  }
  doc.fontSize(12).text(signatureLabel, { align: language === 'ar' ? 'right' : 'left' });
}

const DOCUMENT_DEFINITIONS = [
  {
    type: 'autorisation_depart',
    titleFr: 'Autorisation préalable de départ',
    titleAr: 'إذن مسبق بالمغادرة'
  },
  {
    type: 'ordre_mission',
    titleFr: 'Ordre de mission officiel',
    titleAr: 'الأمر الرسمي بالمهمة'
  },
  {
    type: 'trajet_carburant',
    titleFr: 'Trajet & calcul du carburant estimé',
    titleAr: 'مسار المهمة وحساب الوقود'
  },
  {
    type: 'dotation_previsionnelle',
    titleFr: 'Dotation prévisionnelle',
    titleAr: 'الاعتمادات التقديرية'
  },
  {
    type: 'etat_sortie_carburant',
    titleFr: 'État de sortie du carburant',
    titleAr: 'كشف صرف الوقود'
  },
  {
    type: 'etat_utilisation',
    titleFr: "État d'utilisation de la dotation",
    titleAr: 'كشف استخدام الاعتمادات'
  },
  {
    type: 'rapport_final',
    titleFr: 'Rapport final de mission',
    titleAr: 'التقرير النهائي للمهمة'
  }
];

async function loadMission(db, missionId) {
  const mission = await get(
    db,
    `SELECT missions_unified.*, users.first_name || ' ' || users.last_name AS creator_name,
            users.email AS creator_email, users.grade AS creator_grade, users.direction AS creator_direction
     FROM missions_unified
     JOIN users ON users.id = missions_unified.created_by
     WHERE missions_unified.id = ?`,
    [missionId]
  );
  if (!mission) {
    throw new Error('Mission introuvable');
  }
  mission.destinations = await all(
    db,
    'SELECT city, distance_km, order_index FROM mission_destinations WHERE mission_id = ? ORDER BY order_index',
    [missionId]
  );
  mission.participants = await all(
    db,
    `SELECT mission_participants.*, users.first_name || ' ' || users.last_name AS internal_name, users.email AS internal_email
     FROM mission_participants
     LEFT JOIN users ON users.id = mission_participants.user_id
     WHERE mission_participants.mission_id = ?`,
    [missionId]
  );
  mission.logistics = await get(
    db,
    `SELECT logistics_assignments.*, vehicles.label AS vehicle_label, vehicles.registration,
            drivers.first_name AS driver_first_name, drivers.last_name AS driver_last_name
     FROM logistics_assignments
     LEFT JOIN vehicles ON vehicles.id = logistics_assignments.vehicle_id
     LEFT JOIN drivers ON drivers.id = logistics_assignments.driver_id
     WHERE logistics_assignments.mission_id = ?`,
    [missionId]
  );
  return mission;
}

function formatDate(date, locale = 'fr-FR') {
  if (!date) return '';
  try {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) {
      return String(date);
    }
    return value.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (error) {
    return String(date);
  }
}

function calculateDurationDays(mission) {
  if (mission.duration_days && Number.isFinite(Number(mission.duration_days))) {
    return Number(mission.duration_days);
  }
  if (!mission.start_date || !mission.end_date) {
    return 0;
  }
  const start = new Date(mission.start_date);
  const end = new Date(mission.end_date);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff + 1 : 0;
}

function addImageIfExists(doc, imagePath, x, y, options = {}) {
  if (imagePath && fs.existsSync(imagePath)) {
    doc.image(imagePath, x, y, options);
  }
}

function orderMissionRows(mission, language) {
  const isArabic = language === 'ar';
  const destinations = mission.destinations && mission.destinations.length
    ? mission.destinations.map((item) => item.city).join(isArabic ? '، ' : ', ')
    : '';
  const transport = mission.logistics && mission.logistics.vehicle_label
    ? `${mission.logistics.vehicle_label}${mission.logistics.registration ? ` (${mission.logistics.registration})` : ''}`
    : mission.transport_mode || '—';
  const duration = calculateDurationDays(mission);
  const durationValue = duration ? `${duration} ${isArabic ? 'أيام' : 'jours'}` : '—';
  const departure = formatDate(mission.start_date, isArabic ? 'ar-MA' : 'fr-FR') || '—';
  const back = formatDate(mission.end_date, isArabic ? 'ar-MA' : 'fr-FR') || '—';
  const rowsFr = [
    { label: 'Nom et prénom', value: mission.creator_name || '—' },
    { label: 'Matricule', value: mission.creator_matricule || '—' },
    { label: 'Passport N°', value: mission.creator_passport || '—' },
    { label: 'Fonction', value: mission.creator_grade || '—' },
    { label: 'Destination', value: destinations || mission.departure_city || '—' },
    { label: 'Mode de transport', value: transport || '—' },
    { label: 'Objet de la mission', value: mission.objective || mission.title || '—' },
    { label: 'Durée de la mission', value: durationValue },
    { label: 'Date de départ', value: departure },
    { label: 'Date de retour (fin de Mission)', value: back }
  ];
  const rowsAr = [
    { label: 'الإسم واللقب', value: mission.creator_name || '—' },
    { label: 'الرقم الوظيفي', value: mission.creator_matricule || '—' },
    { label: 'رقم جواز السفر', value: mission.creator_passport || '—' },
    { label: 'الوظيفة', value: mission.creator_grade || '—' },
    { label: 'الوجهة', value: destinations || mission.departure_city || '—' },
    { label: 'وسيلة النقل', value: transport || '—' },
    { label: 'غرض المهمة', value: mission.objective || mission.title || '—' },
    { label: 'مدة المهمة', value: durationValue },
    { label: 'تاريخ الانطلاق', value: departure },
    { label: 'تاريخ العودة (نهاية المهمة)', value: back }
  ];
  return isArabic ? rowsAr : rowsFr;
}

function drawMissionTable(doc, rows, language, tableTop) {
  const isArabic = language === 'ar';
  const tableX = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const labelWidth = isArabic ? 200 : 180;
  const rowHeight = 28;
  let currentY = tableTop;
  doc.lineWidth(1).strokeColor('#000');
  rows.forEach((row) => {
    doc.rect(tableX, currentY, labelWidth, rowHeight).stroke();
    doc.rect(tableX + labelWidth, currentY, contentWidth - labelWidth, rowHeight).stroke();
    const labelAlign = isArabic ? 'right' : 'left';
    const valueAlign = isArabic ? 'right' : 'left';
    doc.fontSize(11).text(row.label || '—', tableX + 8, currentY + 8, {
      width: labelWidth - 16,
      align: labelAlign
    });
    doc.fontSize(11).text(row.value || '—', tableX + labelWidth + 8, currentY + 8, {
      width: contentWidth - labelWidth - 16,
      align: valueAlign
    });
    currentY += rowHeight;
  });
  doc.y = currentY + 20;
}

function drawQrPlaceholder(doc, missionReference, language) {
  const qrSize = 80;
  const qrX = doc.page.margins.left;
  const qrY = doc.page.height - doc.page.margins.bottom - qrSize - 70;
  doc.save();
  doc.lineWidth(1).strokeColor('#cccccc');
  doc.rect(qrX, qrY, qrSize, qrSize).stroke();
  doc.fontSize(9).fillColor('#333333').text(missionReference || '—', qrX, qrY + qrSize / 2 - 6, {
    width: qrSize,
    align: 'center'
  });
  const qrLabel = language === 'ar' ? 'للتأكد امسح الرمز' : 'Scan pour vérification';
  if (language === 'ar') {
    doc.fillColor('#666666');
    renderArabicText(doc, language, 8, qrLabel, {
      width: qrSize,
      align: 'center',
      x: qrX,
      y: qrY + qrSize + 6
    });
  } else {
    doc.fontSize(8).fillColor('#666666').text(qrLabel, qrX, qrY + qrSize + 6, {
      width: qrSize,
      align: 'center'
    });
  }
  doc.restore();
  doc.fillColor('#000000');
  doc.strokeColor('#000000');
}

function createOrderMissionDocument(mission, language) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  getFont(doc, language);
  const isArabic = language === 'ar';
  if (isArabic) {
    doc.direction = 'rtl';
  }

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;
  const startY = doc.page.margins.top;

  renderArabicText(doc, language, 16, 'الجمهورية الإسلامية الموريتانية', {
    width: contentWidth,
    align: 'center'
  });
  renderArabicText(doc, language, 14, 'شرف - إخاء - عدل', {
    width: contentWidth,
    align: 'center'
  });
  addImageIfExists(doc, COAT_OF_ARMS, pageWidth - doc.page.margins.right - 70, startY - 5, { width: 70 });
  doc.moveDown(0.4);
  doc.save();
  doc.lineWidth(2).strokeColor('#8b4513');
  const lineY = doc.y + 10;
  doc.moveTo(doc.page.margins.left + 20, lineY);
  doc.lineTo(pageWidth - doc.page.margins.right - 20, lineY);
  doc.stroke();
  doc.restore();
  doc.moveDown(1.2);

  doc.fontSize(12).text('RÉPUBLIQUE ISLAMIQUE DE MAURITANIE', {
    width: contentWidth,
    align: 'center'
  });
  doc.fontSize(12).text('Honneur - Fraternité - Justice', {
    width: contentWidth,
    align: 'center'
  });

  doc.moveDown(0.8);
  renderArabicText(doc, language, 12, 'وزارة التحول الرقمي وعصرنة الإدارة', {
    width: contentWidth,
    align: 'center'
  });
  doc.fontSize(10.5).text('MINISTÈRE DE LA TRANSFORMATION NUMÉRIQUE ET DE LA MODERNISATION DE L\'ADMINISTRATION', {
    width: contentWidth,
    align: 'center'
  });

  doc.moveDown(1);
  const agencyLogoWidth = 180;
  const agencyY = doc.y;
  addImageIfExists(doc, AGENCY_LOGO, doc.page.margins.left, agencyY, { width: agencyLogoWidth, height: 70 });
  const directorX = doc.page.margins.left + agencyLogoWidth + 15;
  if (isArabic) {
    doc.fontSize(12).text('المدير العام', directorX, agencyY + 20, {
      width: contentWidth - agencyLogoWidth - 15,
      align: 'right'
    });
  } else {
    doc.fontSize(12).text('Le Directeur Général', directorX, agencyY + 20, {
      width: contentWidth - agencyLogoWidth - 15,
      align: 'left'
    });
  }

  const boxWidth = 200;
  const boxHeight = 78;
  const boxX = pageWidth - doc.page.margins.right - boxWidth;
  const boxY = agencyY - 10;
  doc.save();
  doc.lineWidth(1).strokeColor('#8b4513');
  doc.rect(boxX, boxY, boxWidth, boxHeight).stroke();
  doc.restore();
  const today = formatDate(new Date(), 'fr-FR') || '';
  doc.fontSize(11).text('NOUAKCHOTT, LE', boxX + 10, boxY + 12, {
    width: boxWidth - 20,
    align: 'left'
  });
  doc.fontSize(12).fillColor('#0000ff').text(today, boxX + 10, boxY + 28, {
    width: boxWidth - 20,
    align: 'center'
  });
  doc.fillColor('#000000');
  renderArabicText(doc, language, 11, 'نواكشوط، في', {
    width: boxWidth - 20,
    align: 'right',
    x: boxX + 10,
    y: boxY + 44
  });
  doc.fontSize(11).text('N°', boxX + 10, boxY + 58, { width: (boxWidth - 20) / 3, align: 'left' });
  doc.fontSize(12).fillColor('#0000ff').text(mission.reference || '—', boxX + 10, boxY + 58, {
    width: boxWidth - 20,
    align: 'center'
  });
  doc.fillColor('#000000');
  renderArabicText(doc, language, 11, 'الرقم', {
    width: boxWidth - 20,
    align: 'right',
    x: boxX + 10,
    y: boxY + 58
  });

  const afterHeaderY = Math.max(doc.y, boxY + boxHeight) + 30;
  doc.y = afterHeaderY;
  doc.fontSize(24).text(isArabic ? 'أمر بمهمة' : 'ORDRE DE MISSION', {
    width: contentWidth,
    align: 'center'
  });
  const underlineY = doc.y + 4;
  doc.save();
  doc.moveTo((pageWidth / 2) - 100, underlineY);
  doc.lineTo((pageWidth / 2) + 100, underlineY);
  doc.lineWidth(1.2).strokeColor('#000000').stroke();
  doc.restore();
  doc.moveDown(1.5);

  const rows = orderMissionRows(mission, language);
  drawMissionTable(doc, rows, language, doc.y);

  const signatureBoxWidth = 240;
  const signatureX = pageWidth - doc.page.margins.right - signatureBoxWidth;
  const signatureY = doc.y + 20;
  doc.fontSize(14).text(isArabic ? 'المدير العام' : 'Le Directeur Général', signatureX, signatureY, {
    width: signatureBoxWidth,
    align: 'center'
  });
  const signatureImageY = signatureY + 26;
  addImageIfExists(doc, SIGNATURE_DG, signatureX + 40, signatureImageY, { width: 140 });
  const stampY = signatureImageY + 70;
  addImageIfExists(doc, STAMP_ANESP, signatureX + 50, stampY, { width: 120 });
  doc.y = stampY + 120;

  drawQrPlaceholder(doc, mission.reference, language);

  const footerY = doc.page.height - doc.page.margins.bottom - 50;
  doc.save();
  doc.moveTo(doc.page.margins.left, footerY);
  doc.lineTo(pageWidth - doc.page.margins.right, footerY);
  doc.lineWidth(1).strokeColor('#000000').stroke();
  doc.restore();
  doc.fontSize(10).text('Avenue Mokhtar Ould Daddah ZRB 0441 Nouakchott - Mauritanie', doc.page.margins.left, footerY + 8, {
    width: contentWidth / 2 - 10,
    align: 'left'
  });
  doc.fontSize(10).text('نواكشوط - موريتانيا ZRB 0441 شارع المختار ولد داده', doc.page.margins.left + contentWidth / 2 + 10, footerY + 8, {
    width: contentWidth / 2 - 10,
    align: 'right'
  });
  doc.fontSize(10).text('📞 +222 45256800    🌐 anetat.mr', doc.page.margins.left, footerY + 26, {
    width: contentWidth,
    align: 'center'
  });

  return doc;
}

async function createDocument(mission, definition, language) {
  if (definition.type === 'ordre_mission') {
    return createOrderMissionDocument(mission, language);
  }
  const doc = new PDFDocument({ margin: 40 });
  getFont(doc, language);
  if (language === 'ar') {
    doc.direction = 'rtl';
  }
  drawHeader(doc, mission, language);
  doc.fontSize(14).text(translate(definition.titleFr, definition.titleAr, language), {
    align: 'center'
  });
  doc.moveDown();
  drawDestinations(doc, mission, language);
  drawParticipants(doc, mission, language);
  drawLogistics(doc, mission, language);
  drawFooter(doc, language);
  return doc;
}

async function saveDocument(db, missionId, definition, language, mission) {
  const relativeDir = path.join('documents', String(missionId));
  const fullDir = path.join(env.STORAGE_ROOT, relativeDir);
  ensureDir(fullDir);
  const filename = `${definition.type}_${language}.pdf`;
  const fullPath = path.join(fullDir, filename);
  const doc = await createDocument(mission, definition, language);
  const writeStream = fs.createWriteStream(fullPath);
  doc.pipe(writeStream);
  doc.end();
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
  const stats = fs.statSync(fullPath);
  const checksum = fileChecksum(fullPath);
  await run(
    db,
    `INSERT INTO mission_documents (mission_id, document_type, title, language, file_path, mime_type, file_size, checksum)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      missionId,
      definition.type,
      translate(definition.titleFr, definition.titleAr, language),
      language,
      path.join(String(missionId), filename),
      'application/pdf',
      stats.size,
      checksum
    ]
  );
}

async function generateMissionDocuments(db, missionId, user) {
  const mission = await loadMission(db, missionId);
  const docsDir = path.join(env.STORAGE_ROOT, 'documents', String(missionId));
  const generatedTypes = new Set(DOCUMENT_DEFINITIONS.map((definition) => definition.type));
  const existingDocs = await all(
    db,
    'SELECT id, document_type, language, file_path FROM mission_documents WHERE mission_id = ?',
    [missionId]
  );
  for (const doc of existingDocs) {
    if (generatedTypes.has(doc.document_type) && ['fr', 'ar'].includes(doc.language)) {
      const removalPath = doc.file_path.startsWith('documents')
        ? path.join(env.STORAGE_ROOT, doc.file_path)
        : path.join(env.STORAGE_ROOT, 'documents', doc.file_path);
      try {
        fs.unlinkSync(removalPath);
      } catch (error) {
        // ignore missing files
      }
      await run(db, 'DELETE FROM mission_documents WHERE id = ?', [doc.id]);
    }
  }
  for (const definition of DOCUMENT_DEFINITIONS) {
    await saveDocument(db, missionId, definition, 'fr', mission);
    await saveDocument(db, missionId, definition, 'ar', mission);
  }
  const internalParticipants = mission.participants
    .filter((participant) => participant.participant_type === 'internal' && participant.user_id)
    .map((participant) => participant.user_id);
  const recipientIds = Array.from(new Set([mission.created_by, ...internalParticipants]));
  
  // Récupérer les fichiers PDF générés pour les joindre aux emails
  const attachments = [];
  const generatedDocs = await all(
    db,
    'SELECT document_type, language, file_path FROM mission_documents WHERE mission_id = ?',
    [missionId]
  );
  
  for (const doc of generatedDocs) {
    const filePath = doc.file_path.startsWith('documents')
      ? path.join(env.STORAGE_ROOT, doc.file_path)
      : path.join(env.STORAGE_ROOT, 'documents', doc.file_path);
    
    if (fs.existsSync(filePath)) {
      const docDef = DOCUMENT_DEFINITIONS.find(d => d.type === doc.document_type);
      if (docDef) {
        const docName = translate(docDef.titleFr, docDef.titleAr, doc.language);
        attachments.push({
          filename: `${docName}_${doc.language}.pdf`,
          path: filePath
        });
      }
    }
  }
  
  try {
    await notificationService.notifyUsers(db, recipientIds, {
      missionId,
      title: `Ordre de mission ${mission.reference}`,
      body: `Bonjour,<br/><br/>Veuillez trouver ci-joint l'ordre de mission ${mission.reference} en format PDF.<br/><br/>Cordialement,<br/>ANESP`,
      type: 'documents',
      link: `/missions/${missionId}`,
      attachments
    });
  } catch (error) {
    console.error('Notification documents error', error);
  }
}

module.exports = { generateMissionDocuments };
