const SHEET_ID = "1Jh_ZS3lYL-wt_UHU51Ium7FkPSOLrEURdf-AkIqy5Cc";
const NOTIFICATION_EMAIL = "rhbiconnecteo@gmail.com";
const APP_URL = "https://mouvement-rh.vercel.app";
const DAILY_SUMMARY_EMAIL = "herizo.ramboamiarison@connecteo.mg";
const DAILY_SUMMARY_CC = "Liantsoa@connecteo.mg,Tyfannie@connecteo.mg,Zélie@connecteo.mg";
const DAILY_SUMMARY_RECIPIENTS = [NOTIFICATION_EMAIL, DAILY_SUMMARY_EMAIL];

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
        sage: params.sage,
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

    if (type === "sendTodayDepartSummary") {
      return jsonResponse(sendTodayDepartSummaryEmail());
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
      ? `Départ de collaborateur - ${payload.matricule || ''} ${payload.nom || ''}`.trim()
      : `Mouvement de collaborateur - ${payload.matricule || ''} ${payload.nom || ''}`.trim();

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
          `Date d\'enregistrement: ${payload.insertedAt || ''}`,
          '',
          `Créer le ticket: ${APP_URL}`
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
          `Date d\'enregistrement: ${payload.insertedAt || ''}`,
          '',
          `Ouvrir l'application: ${APP_URL}`
        ];

    const htmlBody = bodyLines
      .map(line => {
        if (!line) return '<br>';
        if (line.indexOf(APP_URL) >= 0) {
          return `<p><a href="${APP_URL}" target="_blank" rel="noopener noreferrer">${line.replace(`${APP_URL}`, 'mouvement-rh.vercel.app')}</a></p>`;
        }
        return `<p>${line}</p>`;
      })
      .join('');

    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: subject,
      body: bodyLines.join('\n'),
      htmlBody: htmlBody
    });
  } catch (err) {
    Logger.log('Notification email failed: ' + err);
  }
}

function sendTodayDepartSummaryEmail() {
  try {
    const { departs } = getTodayDepartRows();
    Logger.log('sendTodayDepartSummaryEmail: ' + departs.length + ' ligne(s) trouvée(s).');

    if (!departs.length) {
      Logger.log('sendTodayDepartSummaryEmail: aucun enregistrement du jour, envoi annulé.');
      return {
        status: 'success',
        message: 'Aucune ligne du jour à envoyer.',
        sent: false,
        rowCount: 0
      };
    }

    const todayLabel = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
    const subject = `Départ de collaborateur - Départs du jour - ${todayLabel} (${departs.length})`;
    const htmlBody = buildTodayDepartSummaryHtml(departs, todayLabel);
    const plainBody = buildTodayDepartSummaryPlainText(departs, todayLabel);

    Logger.log("sendTodayDepartSummaryEmail: tentative d'envoi vers " + DAILY_SUMMARY_RECIPIENTS.join(', '));

    try {
      MailApp.sendEmail({
        to: DAILY_SUMMARY_RECIPIENTS.join(','),
        cc: DAILY_SUMMARY_CC,
        subject: subject,
        body: plainBody,
        htmlBody: htmlBody
      });
      Logger.log('sendTodayDepartSummaryEmail: envoi MailApp réussi.');
    } catch (mailErr) {
      Logger.log('sendTodayDepartSummaryEmail: MailApp a échoué, fallback GmailApp: ' + mailErr);
      GmailApp.sendEmail(DAILY_SUMMARY_EMAIL, subject, plainBody, {
        htmlBody: htmlBody
      });
      Logger.log('sendTodayDepartSummaryEmail: envoi GmailApp réussi vers ' + DAILY_SUMMARY_EMAIL);
    }

    return {
      status: 'success',
      message: `Mail envoyé avec ${departs.length} ligne(s).`,
      sent: true,
      rowCount: departs.length
    };
  } catch (err) {
    Logger.log('sendTodayDepartSummaryEmail: erreur fatale: ' + err);
    return {
      status: 'error',
      message: err.toString(),
      sent: false
    };
  }
}

function sendTodayDepartSummary() {
  return sendTodayDepartSummaryEmail();
}

function getTodayDepartRows() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Départ');
  if (!sheet) {
    return { departs: [], todayKey: formatSheetDate(new Date()) };
  }

  const data = sheet.getDataRange().getValues();
  const displayData = sheet.getDataRange().getDisplayValues();
  const headers = (data[0] || []).map(normalizeHeader);
  const todayKey = formatSheetDate(new Date());
  const todayDisplayKey = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');

  const getValue = (row, headerName) => {
    const index = getHeaderIndex(headers, headerName);
    return index >= 0 ? row[index] : '';
  };

  const getDisplayValue = (row, headerName) => {
    const index = getHeaderIndex(headers, headerName);
    return index >= 0 ? String(row[index] || '').trim() : '';
  };

  const departs = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const displayRow = displayData[i] || [];
    if (!row || !getValue(row, 'Matricule')) continue;

    const insertedDateValue = getValue(row, "Date d'insertion");
    const insertedDateKey = formatSheetDate(insertedDateValue);
    const insertedDateDisplay = getDisplayValue(displayRow, "Date d'insertion");

    if (insertedDateKey !== todayKey && insertedDateDisplay !== todayDisplayKey) continue;

    departs.push({
      matricule: String(getValue(row, 'Matricule') || '').trim(),
      statut: String(getValue(row, 'Statut') || '').trim(),
      nom: String(getValue(row, 'Nom et Prénoms') || '').trim(),
      fonction: String(getValue(row, 'Fonction') || '').trim(),
      motif: String(getValue(row, 'Motif de départ') || getValue(row, 'Motif du départ') || '').trim(),
      dateDepart: formatDate(getValue(row, 'Date de départ')) || ''
    });
  }

  return { departs, todayKey };
}

function buildTodayDepartSummaryPlainText(departs, todayLabel) {
  const lines = [
    `Départs du jour - ${todayLabel}`,
    '',
    'Matricule | Statut | Nom et Prénom | Fonction | Date de départ'
  ];

  departs.forEach(item => {
    lines.push([
      item.matricule,
      item.statut,
      item.nom,
      item.fonction,
      item.dateDepart
    ].join(' | '));
  });

  lines.push('');
  lines.push('Si vous souhaitez créer une référence de ticket pour ces départs, cliquez sur le lien ci-dessous pour accéder au site.');
  lines.push(APP_URL);

  return lines.join('\n');
}

function buildTodayDepartSummaryHtml(departs, todayLabel) {
  const rowsHtml = departs.map((item, index) => {
    const rowBackground = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    return `
      <tr style="background:${rowBackground};">
        ${buildSummaryBodyCell(item.matricule, 'width:12%;')}
        ${buildSummaryBodyCell(item.statut, 'width:10%;')}
        ${buildSummaryBodyCell(item.nom, 'width:27%;')}
        ${buildSummaryBodyCell(item.fonction, 'width:23%;')}
        ${buildSummaryBodyCell(item.motif, 'width:18%;')}
        ${buildSummaryBodyCell(item.dateDepart, 'width:10%;white-space:nowrap;')}
      </tr>
    `;
  }).join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0;padding:0;background:#eef4ff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="980" cellspacing="0" cellpadding="0" border="0" style="width:980px;max-width:980px;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #dbe3f0;">
            <tr>
              <td style="background:#10254f;padding:24px 30px;color:#ffffff;">
                <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;line-height:1.2;">Connecteo</div>
                <div style="font-size:28px;line-height:1.2;font-weight:800;margin-top:10px;">Départs du jour</div>
                <div style="font-size:15px;line-height:1.4;margin-top:8px;">Date d'insertion: ${escapeHtml(todayLabel)} - ${departs.length} enregistrement(s)</div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 22px 10px 22px;background:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid #dbe3f0;table-layout:auto;">
                  <thead>
                    <tr>
                      ${buildSummaryHeaderCell('Matricule')}
                      ${buildSummaryHeaderCell('Statut')}
                      ${buildSummaryHeaderCell('Nom et Prénom')}
                      ${buildSummaryHeaderCell('Fonction')}
                      ${buildSummaryHeaderCell('Motif')}
                      ${buildSummaryHeaderCell('Date de départ')}
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
                <div style="margin-top:14px;font-size:12px;line-height:1.5;color:#64748b;">Ce message regroupe uniquement les lignes dont la Date d'insertion correspond à aujourd'hui.</div>
                <div style="margin-top:16px;padding:14px 16px;border:1px solid #dbe3f0;background:#f8fbff;border-radius:6px;">
                  <div style="font-size:13px;line-height:1.6;color:#1e293b;">
                    Si vous souhaitez créer une référence de ticket pour ces départs, cliquez sur le lien ci-dessous pour accéder au site.
                  </div>
                  <div style="margin-top:10px;">
                    <a href="${APP_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 14px;background:#10254f;color:#ffffff;text-decoration:none;border-radius:4px;font-size:13px;font-weight:700;">Ouvrir le site de création de ticket</a>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function buildSummaryHeaderCell(label) {
  return `<th align="left" style="text-align:left;padding:14px 16px;background:#0f172a;color:#fff;font-size:13px;font-weight:700;letter-spacing:.02em;border-right:1px solid #22304a;border-bottom:1px solid #0b1220;white-space:normal;word-break:break-word;line-height:1.25;vertical-align:top;">${escapeHtml(label)}</th>`;
}

function buildSummaryBodyCell(value, extraStyle) {
  return `<td style="padding:14px 16px;font-size:13px;line-height:1.45;color:#0f172a;border-top:1px solid #e5e7eb;vertical-align:top;word-break:break-word;white-space:normal;overflow-wrap:anywhere;${extraStyle || ''}">${escapeHtml(value)}</td>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
      sage: parseBooleanValue(getValue(row, 'Sage')),
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
    const sage = parseBooleanValue(payload && payload.sage);
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
    const sageIndex = getHeaderIndex(headers, 'Sage');

    if (ticketIndex < 0 || dateCreationIndex < 0 || sageIndex < 0) {
      return { status: 'error', message: 'Les colonnes Ticket, Sage et Date de création doivent exister dans la feuille Départ.' };
    }

    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
    const allowedRows = new Set(departs.map(item => item.rowNumber));
    let updatedCount = 0;

    selectedRows.forEach(rowNumber => {
      const numericRow = Number(rowNumber);
      if (!allowedRows.has(numericRow)) return;

      sheet.getRange(numericRow, ticketIndex + 1).setValue(ticket);
      sheet.getRange(numericRow, sageIndex + 1).setValue(sage);
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
          sage: parseBooleanValue(getValue(data[i], 'Sage')),
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
