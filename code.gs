const SHEET_ID = "1Jh_ZS3lYL-wt_UHU51Ium7FkPSOLrEURdf-AkIqy5Cc";
const NOTIFICATION_EMAIL = "rhbiconnecteo@gmail.com";

function doPost(e) {
  return handleRequest(extractRequestParams(e));
}

function extractRequestParams(e) {
  const params = {};

  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(key => {
      params[key] = e.parameter[key];
    });
  }

  const contents = e && e.postData && typeof e.postData.contents === 'string' ? e.postData.contents.trim() : '';
  if (!contents) {
    return params;
  }

  const contentType = String(e.postData.type || '').toLowerCase();

  if (contentType.indexOf('application/json') >= 0) {
    try {
      const jsonParams = JSON.parse(contents);
      if (jsonParams && typeof jsonParams === 'object') {
        Object.keys(jsonParams).forEach(key => {
          params[key] = jsonParams[key];
        });
      }
    } catch (err) {
      Logger.log('Impossible de parser le JSON entrant: ' + err);
    }
    return params;
  }

  contents.split('&').forEach(part => {
    if (!part) return;
    const separatorIndex = part.indexOf('=');
    const rawKey = separatorIndex >= 0 ? part.slice(0, separatorIndex) : part;
    const rawValue = separatorIndex >= 0 ? part.slice(separatorIndex + 1) : '';
    const key = decodeURIComponent(String(rawKey).replace(/\+/g, ' '));
    const value = decodeURIComponent(String(rawValue).replace(/\+/g, ' '));
    params[key] = value;
  });

  return params;
}

function handleRequest(params) {
  try {
    const type = params.type;
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // ============================
    // GET DATA
    // ============================
    if (type === "getData") {
      const baseSheet = ss.getSheetByName("Base de donnée");
      const data = baseSheet.getDataRange().getValues();
      const employes = [];
      const headers = (data[0] || []).map(normalizeHeader);
      const getValue = (row, headerName) => {
        const index = headers.indexOf(normalizeHeader(headerName));
        return index >= 0 ? row[index] : '';
      };

      for (let i = 1; i < data.length; i++) {
        if (data[i] && getValue(data[i], 'Matricule')) {
          employes.push({
            matricule: String(getValue(data[i], 'Matricule') || '').trim(),
            dateIntegration: formatDate(getValue(data[i], "Date d'intégration")) || '',
            statut: String(getValue(data[i], 'Statut') || '').trim(),
            nom: String(getValue(data[i], 'Nom et Prénoms') || '').trim(),
            fonction: String(getValue(data[i], 'Fonction') || '').trim(),
            rattachement: String(getValue(data[i], 'Rattachement') || '').trim(),
            login: String(getValue(data[i], 'Login') || '').trim(),
            mailConnecteo: String(getValue(data[i], 'Mail connecteo') || getValue(data[i], 'Mail Connecteo') || '').trim()
          });
        }
      }

      return jsonResponse({
        status: "success",
        employes: employes,
        motifsDepart: ["Démission", "Licenciement", "Congé maternité"],
        motifsMouvement: ["Basculement CDI", "Nomination", "Mutation", "Promotion"]
      });
    }

    if (type === "updateChecking") {
      const result = updateCheckingState({
        sheetName: params.sheetName,
        rowNumber: params.rowNumber,
        checking: params.checking
      });

      return jsonResponse(result);
    }

    // ============================
    // GET ENTRIES
    // ============================
    if (type === "getEntries") {
      return jsonResponse({
        status: "success",
        ...getEntries()
      });
    }

    if (type === "getTicketRows") {
      return jsonResponse({
        status: "success",
        departs: readDepartRowsForTicketing().departs
      });
    }

    if (type === "saveTickets") {
      const result = saveDepartTickets({
        ticket: params.ticket,
        selectedRows: parseSelectedRows(params.selectedRows)
      });

      return jsonResponse(result);
    }

    if (type === "debugEcho") {
      return jsonResponse({
        status: 'success',
        received: params
      });
    }

    // ============================
    // DEPART (avec HRBP)
    // ============================
    if (type === "depart") {
      const sheet = ss.getSheetByName("Départ");
      const insertDate = new Date();
      const departDate = formatSheetDate(params.dateDepart) || '';

      sheet.appendRow([
        formatSheetDate(insertDate),
        params.hrbp || '',          // HRBP
        params.matricule || '',
        formatSheetDate(params.dateIntegration) || '',
        params.statut || '',
        params.nom || '',
        params.fonction || '',
        params.rattachement || '',
        formatSheetDate(params.dateDepart) || '',
        params.motif || '',
        params.raison || '',
        params.login || '',
        params.mailConnecteo || '',
        '',
        ''
      ]);

      sendNotificationEmail('depart', {
        hrbp: params.hrbp || '',
        matricule: params.matricule || '',
        nom: params.nom || '',
        fonction: params.fonction || '',
        rattachement: params.rattachement || '',
        dateDepart: departDate,
        motif: params.motif || '',
        raison: params.raison || '',
        login: params.login || '',
        mailConnecteo: params.mailConnecteo || '',
        dateIntegration: formatSheetDate(params.dateIntegration) || '',
        insertedAt: formatSheetDate(insertDate) || ''
      });

      return jsonResponse({
        status: "success",
        message: "Départ enregistré avec succès"
      });
    }

    // ============================
    // MOUVEMENT (avec HRBP)
    // ============================
    if (type === "mouvement") {
      const sheet = ss.getSheetByName("Mouvement");
      const insertDate = new Date();
      const movementDate = formatSheetDate(params.dateMvt) || '';

      sheet.appendRow([
        formatSheetDate(insertDate),
        params.hrbp || '',          // ✅ NOUVELLE COLONNE
        params.matricule || '',
        params.nom || '',
        formatSheetDate(params.dateMvt) || '',
        params.ancienPoste || '',
        params.nouveauPoste || '',
        params.typeMvt || '',
        params.raisonMvt || '',
        ''
      ]);

      sendNotificationEmail('mouvement', {
        hrbp: params.hrbp || '',
        matricule: params.matricule || '',
        nom: params.nom || '',
        dateMvt: movementDate,
        ancienPoste: params.ancienPoste || '',
        nouveauPoste: params.nouveauPoste || '',
        typeMvt: params.typeMvt || '',
        raisonMvt: params.raisonMvt || '',
        insertedAt: formatSheetDate(insertDate) || ''
      });

      return jsonResponse({
        status: "success",
        message: "Mouvement enregistré avec succès"
      });
    }

    return jsonResponse({ status: "error", message: "Type invalide" });

  } catch (err) {
    return jsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function formatDate(value) {
  if (!value) return '';
  try {
    const d = (value instanceof Date) ? value : new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  } catch (e) {
    return String(value);
  }
}

function formatSheetDate(value) {
  if (!value) return '';
  try {
    const d = (value instanceof Date) ? value : new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  } catch (e) {
    return String(value);
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getHeaderIndex(headers, headerName) {
  return headers.indexOf(normalizeHeader(headerName));
}

function parseSelectedRows(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function parseBooleanValue(value) {
  if (value === true || value === 'true' || value === 'TRUE' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 'FALSE' || value === 0 || value === '0' || value === '' || value === null || typeof value === 'undefined') return false;
  return Boolean(value);
}

function sendNotificationEmail(type, payload) {
  try {
    const subject = type === 'depart'
      ? `Départ enregistré - ${payload.matricule || ''} ${payload.nom || ''}`.trim()
      : `Mouvement enregistré - ${payload.matricule || ''} ${payload.nom || ''}`.trim();

    const bodyLines = type === 'depart'
      ? [
          'Un départ vient d\'être enregistré.',
          '',
          `HRBP: ${payload.hrbp || ''}`,
          `Matricule: ${payload.matricule || ''}`,
          `Nom et prénoms: ${payload.nom || ''}`,
          `Fonction: ${payload.fonction || ''}`,
          `Rattachement: ${payload.rattachement || ''}`,
          `Date d\'intégration: ${payload.dateIntegration || ''}`,
          `Date de départ: ${payload.dateDepart || ''}`,
          `Motif: ${payload.motif || ''}`,
          `Raison: ${payload.raison || ''}`,
          `Login: ${payload.login || ''}`,
          `Mail Connecteo: ${payload.mailConnecteo || ''}`,
          `Date d\'enregistrement: ${payload.insertedAt || ''}`
        ]
      : [
          'Un mouvement vient d\'être enregistré.',
          '',
          `HRBP: ${payload.hrbp || ''}`,
          `Matricule: ${payload.matricule || ''}`,
          `Nom et prénoms: ${payload.nom || ''}`,
          `Date de mouvement: ${payload.dateMvt || ''}`,
          `Ancien poste: ${payload.ancienPoste || ''}`,
          `Nouveau poste: ${payload.nouveauPoste || ''}`,
          `Type de mouvement: ${payload.typeMvt || ''}`,
          `Raison: ${payload.raisonMvt || ''}`,
          `Date d\'enregistrement: ${payload.insertedAt || ''}`
        ];

    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: subject,
      body: bodyLines.join('\n')
    });
  } catch (err) {
    Logger.log('Notification email failed: ' + err);
  }
}

function getSheetRowsWithHeaders(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { sheet: null, data: [], headers: [] };

  const data = sheet.getDataRange().getValues();
  const headers = (data[0] || []).map(normalizeHeader);
  return { sheet, data, headers };
}

function readDepartRowsForTicketing() {
  const { sheet, data, headers } = getSheetRowsWithHeaders('Départ');
  const ticketIndex = getHeaderIndex(headers, 'Ticket');
  const dateCreationIndex = getHeaderIndex(headers, 'Date de création');

  const getValue = (row, headerName) => {
    const index = getHeaderIndex(headers, headerName);
    return index >= 0 ? row[index] : '';
  };

  const departs = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !getValue(row, 'Matricule')) continue;

    const ticketValue = ticketIndex >= 0 ? String(row[ticketIndex] || '').trim() : '';
    if (ticketValue) continue;

    departs.push({
      rowNumber: i + 1,
      timestamp: formatDate(getValue(row, "Date d'insertion")) || '',
      hrbp: String(getValue(row, 'hrbp') || '').trim(),
      matricule: String(getValue(row, 'Matricule') || '').trim(),
      dateIntegration: formatDate(getValue(row, "Date d'intégration")) || '',
      statut: String(getValue(row, 'Statut') || '').trim(),
      nom: String(getValue(row, 'Nom et Prénoms') || '').trim(),
      fonction: String(getValue(row, 'Fonction') || '').trim(),
      rattachement: String(getValue(row, 'Rattachement') || '').trim(),
      dateDepart: formatDate(getValue(row, 'Date de départ')) || '',
      motif: String(getValue(row, 'Motif de départ') || getValue(row, 'Motif du départ') || '').trim(),
      raison: String(getValue(row, 'Raison de départ') || getValue(row, 'Raison du départ') || '').trim(),
      login: String(getValue(row, 'Login') || '').trim(),
      mailConnecteo: String(getValue(row, 'Mail connecteo') || getValue(row, 'Mail Connecteo') || '').trim(),
      ticket: ticketIndex >= 0 ? String(row[ticketIndex] || '').trim() : '',
      dateCreation: dateCreationIndex >= 0 ? formatDate(row[dateCreationIndex]) || '' : '',
      checking: parseBooleanValue(getValue(row, 'Checking'))
    });
  }

  return { sheet, headers, departs };
}

function getTicketSidebarData() {
  try {
    const { departs } = readDepartRowsForTicketing();
    return {
      status: 'success',
      departs: departs
    };
  } catch (err) {
    return {
      status: 'error',
      message: err.toString()
    };
  }
}

function updateCheckingState(payload) {
  try {
    const sheetName = String(payload && payload.sheetName ? payload.sheetName : '').trim();
    const rowNumber = Number(payload && payload.rowNumber);
    const checking = parseBooleanValue(payload && payload.checking);

    if (!sheetName) {
      return { status: 'error', message: 'La feuille est obligatoire.' };
    }

    if (!rowNumber || rowNumber < 2) {
      return { status: 'error', message: 'La ligne est invalide.' };
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return { status: 'error', message: `La feuille ${sheetName} est introuvable.` };
    }

    const data = sheet.getDataRange().getValues();
    const headers = (data[0] || []).map(normalizeHeader);
    const checkingIndex = getHeaderIndex(headers, 'Checking');
    if (checkingIndex < 0) {
      return { status: 'error', message: `La colonne Checking est introuvable dans la feuille ${sheetName}.` };
    }

    const currentChecking = parseBooleanValue((data[rowNumber - 1] || [])[checkingIndex]);
    if (currentChecking && !checking) {
      return { status: 'error', message: 'Cette ligne est déjà traitée et ne peut plus être décochée.' };
    }

    sheet.getRange(rowNumber, checkingIndex + 1).setValue(checking);

    return {
      status: 'success',
      message: checking ? 'Ligne marquée comme traitée.' : 'Ligne marquée comme non traitée.'
    };
  } catch (err) {
    return {
      status: 'error',
      message: err.toString()
    };
  }
}

function saveDepartTickets(payload) {
  try {
    const ticket = String(payload && payload.ticket ? payload.ticket : '').trim();
    const selectedRows = Array.isArray(payload && payload.selectedRows) ? payload.selectedRows : [];

    if (!ticket) {
      return { status: 'error', message: 'Le ticket est obligatoire.' };
    }

    if (!selectedRows.length) {
      return { status: 'error', message: 'Sélectionnez au moins un collaborateur.' };
    }

    const { sheet, headers, departs } = readDepartRowsForTicketing();
    if (!sheet) {
      return { status: 'error', message: 'La feuille Départ est introuvable.' };
    }

    const ticketIndex = getHeaderIndex(headers, 'Ticket');
    const dateCreationIndex = getHeaderIndex(headers, 'Date de création');

    if (ticketIndex < 0 || dateCreationIndex < 0) {
      return { status: 'error', message: 'Les colonnes Ticket et Date de création doivent exister dans la feuille Départ.' };
    }

    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
    const allowedRows = new Set(departs.map(item => item.rowNumber));
    let updatedCount = 0;

    selectedRows.forEach(rowNumber => {
      const numericRow = Number(rowNumber);
      if (!allowedRows.has(numericRow)) return;

      sheet.getRange(numericRow, ticketIndex + 1).setValue(ticket);
      sheet.getRange(numericRow, dateCreationIndex + 1).setValue(today);
      const checkingIndex = getHeaderIndex(headers, 'Checking');
      if (checkingIndex >= 0) {
        sheet.getRange(numericRow, checkingIndex + 1).setValue(true);
      }
      updatedCount++;
    });

    return {
      status: 'success',
      message: updatedCount > 1 ? 'Tickets enregistrés avec succès.' : 'Ticket enregistré avec succès.',
      updatedCount: updatedCount
    };
  } catch (err) {
    return {
      status: 'error',
      message: err.toString()
    };
  }
}

// Affiche une sidebar contenant l'historique des enregistrements
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('Historique des enregistrements');
  try {
    SpreadsheetApp.getUi().showSidebar(html);
    return;
  } catch (e) {
    // si ce script est attaché à un document ou formulaire
  }

  try {
    DocumentApp.getUi().showSidebar(html);
    return;
  } catch (e) {}

  try {
    FormApp.getUi().showSidebar(html);
    return;
  } catch (e) {}

  Logger.log('Impossible d afficher la sidebar: aucun UI container trouvé');
}

function showTicketSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('TicketSidebar').setTitle('Création de ticket');
  try {
    SpreadsheetApp.getUi().showSidebar(html);
    return;
  } catch (e) {
    // si ce script est attaché à un document ou formulaire
  }

  try {
    DocumentApp.getUi().showSidebar(html);
    return;
  } catch (e) {}

  try {
    FormApp.getUi().showSidebar(html);
    return;
  } catch (e) {}

  Logger.log('Impossible d afficher la sidebar: aucun UI container trouvé');
}

// Renvoie les dernières entrées des feuilles 'Départ' et 'Mouvement'
function getEntries() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const result = { depart: [], mouvement: [] };

  const sheetDepart = ss.getSheetByName('Départ');
  if (sheetDepart) {
    const data = sheetDepart.getDataRange().getValues();
    const headers = (data[0] || []).map(normalizeHeader);
    const getValue = (row, headerName) => {
      const index = headers.indexOf(normalizeHeader(headerName));
      return index >= 0 ? row[index] : '';
    };

    for (let i = 1; i < data.length; i++) {
      if (data[i] && getValue(data[i], 'Matricule')) {
        result.depart.push({
          rowNumber: i + 1,
          timestamp: formatDate(getValue(data[i], "Date d'insertion")) || new Date(),
          hrbp: getValue(data[i], 'hrbp') || '',
          matricule: String(getValue(data[i], 'Matricule') || ''),
          dateIntegration: formatDate(getValue(data[i], "Date d'intégration")) || '',
          statut: String(getValue(data[i], 'Statut') || ''),
          nom: String(getValue(data[i], 'Nom et Prénoms') || ''),
          fonction: String(getValue(data[i], 'Fonction') || ''),
          rattachement: String(getValue(data[i], 'Rattachement') || ''),
          dateDepart: formatDate(getValue(data[i], "Date de départ") || getValue(data[i], "Date de départ")) || '',
          motif: getValue(data[i], "Motif de départ") || getValue(data[i], "Motif du départ") || '',
          raison: getValue(data[i], "Raison de départ") || getValue(data[i], "Raison du départ") || '',
          login: String(getValue(data[i], 'Login') || ''),
          mailConnecteo: String(getValue(data[i], 'Mail connecteo') || getValue(data[i], 'Mail Connecteo') || ''),
          ticket: String(getValue(data[i], 'Ticket') || '').trim(),
          dateCreation: formatDate(getValue(data[i], 'Date de création')) || '',
          checking: parseBooleanValue(getValue(data[i], 'Checking'))
        });
      }
    }
  }

  const sheetMvt = ss.getSheetByName('Mouvement');
  if (sheetMvt) {
    const data2 = sheetMvt.getDataRange().getValues();
    const headers2 = (data2[0] || []).map(normalizeHeader);
    const getValue2 = (row, headerName) => {
      const index = headers2.indexOf(normalizeHeader(headerName));
      return index >= 0 ? row[index] : '';
    };

    for (let i = 1; i < data2.length; i++) {
      if (data2[i] && getValue2(data2[i], 'Matricule')) {
        result.mouvement.push({
          rowNumber: i + 1,
          timestamp: formatDate(getValue2(data2[i], "Date d'insertion")) || new Date(),
          hrbp: getValue2(data2[i], 'hrbp') || '',
          matricule: String(getValue2(data2[i], 'Matricule') || ''),
          nom: String(getValue2(data2[i], 'Nom et Prénoms') || getValue2(data2[i], 'Nom') || ''),
          dateMvt: formatDate(
            getValue2(data2[i], "Date du mouvement") ||
            getValue2(data2[i], "Date de mouvement") ||
            getValue2(data2[i], "Date du MVT") ||
            getValue2(data2[i], "Date MVT")
          ) || '',
          ancienPoste: getValue2(data2[i], "Ancien poste") || getValue2(data2[i], "Ancien Poste") || '',
          nouveauPoste: getValue2(data2[i], "Nouveau poste") || getValue2(data2[i], "Nouveau Poste") || '',
          typeMvt: getValue2(data2[i], "Type de mouvement") || getValue2(data2[i], "Type du mouvement") || getValue2(data2[i], "Type du MVT") || getValue2(data2[i], "Type MVT") || '',
          raisonMvt: getValue2(data2[i], "Raison du mouvement") || getValue2(data2[i], "Raison de mouvement") || getValue2(data2[i], "Raison du MVT") || getValue2(data2[i], "Raison MVT") || '',
          checking: parseBooleanValue(getValue2(data2[i], 'Checking'))
        });
      }
    }
  }

  return result;
}

// Ajoute un menu dans l'UI pour ouvrir la sidebar
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Mouvement')
      .addItem('Historique', 'showSidebar')
      .addItem('Création de ticket', 'showTicketSidebar')
      .addToUi();
  } catch (e) {
    // ignore si pas dans un spreadsheet
  }
}
