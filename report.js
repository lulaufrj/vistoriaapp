// ============================================
// Report Generation Module
// ============================================

const Report = {
  /**
   * Generate review content
   */
  generateReview(propertyData, rooms) {
    const container = document.getElementById('reviewContent');

    const html = `
      <div style="max-width: 800px; margin: 0 auto;">
        
        <!-- Property Information -->
        <div style="background: var(--gray-50); padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 2rem;">
          <h3 style="margin-top: 0; color: var(--primary-700);">📋 Informações do Imóvel</h3>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <strong>Tipo de Vistoria:</strong><br>
              ${propertyData.inspectionType === 'entrada' ? 'Vistoria de Entrada' : 'Vistoria de Saída'}
            </div>
            <div>
              <strong>Código:</strong><br>
              ${propertyData.code}
            </div>
          </div>
          
          <div style="margin-bottom: 1rem;">
            <strong>Endereço:</strong><br>
            ${propertyData.address}<br>
            ${propertyData.neighborhood}, ${propertyData.city} - ${propertyData.zipCode}
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
            <div>
              <strong>Tipo:</strong><br>
              ${this.getPropertyTypeLabel(propertyData.type)}
            </div>
            <div>
              <strong>Área Total:</strong><br>
              ${propertyData.totalArea ? propertyData.totalArea + ' m²' : 'Não informado'}
            </div>
            <div>
              <strong>Cômodos:</strong><br>
              ${rooms.length} registrados
            </div>
          </div>
        </div>

        <!-- Rooms Summary -->
        <div style="margin-bottom: 2rem;">
          <h3 style="color: var(--primary-700);">🏠 Cômodos Vistoriados (${rooms.length})</h3>
          
          ${rooms.length === 0 ? `
            <p style="color: var(--gray-500); text-align: center; padding: 2rem;">
              Nenhum cômodo registrado
            </p>
          ` : rooms.map(room => this.renderRoomReview(room)).join('')}
        </div>

        <!-- Statistics -->
        <div style="background: var(--primary-50); padding: 1.5rem; border-radius: var(--radius-lg);">
          <h3 style="margin-top: 0; color: var(--primary-700);">📊 Estatísticas</h3>
          ${this.generateStatistics(rooms)}
        </div>

      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * Render single room review
   */
  renderRoomReview(room) {
    const displayName = room.name || Utils.getRoomTypeLabel(room.type);
    const photoCount = room.photos ? room.photos.length : 0;
    const audioCount = room.audios ? room.audios.length : 0;

    return `
      <div style="background: white; border: 2px solid var(--gray-200); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1rem;">
        
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <h4 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.5rem;">${Utils.getRoomIcon(room.type)}</span>
            ${displayName}
          </h4>
          <span class="badge badge-${room.condition}">
            ${Utils.getConditionLabel(room.condition)}
          </span>
        </div>

        ${room.description ? `
          <div style="background: var(--gray-50); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
            <strong>Descrição Detalhada:</strong>
            <div style="margin-top: 0.5rem; white-space: pre-wrap;">${room.description}</div>
          </div>
        ` : ''}

        ${room.photos && room.photos.length > 0 ? `
          <div>
            <strong>📷 Fotos (${photoCount}):</strong>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.5rem; margin-top: 0.5rem;">
              ${room.photos.map(photo => `
                <div style="position: relative;">
                    <img src="${photo.url || photo.data}" alt="Foto" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--gray-200);">
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--gray-200); font-size: 0.875rem; color: var(--gray-600);">
          📷 ${photoCount} foto(s) | 🎤 ${audioCount} áudio(s)
        </div>

      </div>
    `;
  },

  /**
   * Generate statistics
   */
  generateStatistics(rooms) {
    const totalPhotos = rooms.reduce((sum, room) => sum + (room.photos ? room.photos.length : 0), 0);
    const totalAudios = rooms.reduce((sum, room) => sum + (room.audios ? room.audios.length : 0), 0);

    const conditionCounts = {
      excelente: 0,
      bom: 0,
      regular: 0,
      ruim: 0,
      pessimo: 0
    };

    rooms.forEach(room => {
      if (conditionCounts.hasOwnProperty(room.condition)) {
        conditionCounts[room.condition]++;
      }
    });

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: 700; color: var(--primary-600);">${rooms.length}</div>
          <div style="font-size: 0.875rem; color: var(--gray-600);">Cômodos</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: 700; color: var(--primary-600);">${totalPhotos}</div>
          <div style="font-size: 0.875rem; color: var(--gray-600);">Fotos</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: 700; color: var(--primary-600);">${totalAudios}</div>
          <div style="font-size: 0.875rem; color: var(--gray-600);">Áudios</div>
        </div>
      </div>
      
      <div style="margin-top: 1.5rem;">
        <strong>Estado de Conservação:</strong>
        <div style="margin-top: 0.5rem;">
          ${Object.entries(conditionCounts).map(([condition, count]) => count > 0 ? `
            <span class="badge badge-${condition}" style="margin-right: 0.5rem;">
              ${Utils.getConditionLabel(condition)}: ${count}
            </span>
          ` : '').join('')}
        </div>
      </div>
    `;
  },

  /**
   * Get property type label
   */
  getPropertyTypeLabel(type) {
    const labels = {
      'apartamento': 'Apartamento',
      'casa': 'Casa',
      'sobrado': 'Sobrado',
      'kitnet': 'Kitnet',
      'comercial': 'Comercial'
    };
    return labels[type] || type;
  },

  /**
   * Generate final report HTML
   */
  generateReportHTML(propertyData, rooms, metadata = null) {
    const date = Utils.formatDate();

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Laudo de Vistoria - ${propertyData.code}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            padding: 20px;
            background: white;
            box-sizing: border-box;
          }
          @media print {
            @page {
                margin: 20mm 20mm 25mm 20mm; /* Top Right Bottom Left */
                size: A4;
            }
            body { 
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                background: white;
            }
            .header, .footer, .room-section, .info-grid {
                width: 100%;
                box-sizing: border-box;
            }
            
            .room-section { 
                break-inside: avoid; /* Prevent splitting the room card */
                page-break-inside: avoid;
                margin-bottom: 20px;
                padding: 16px; /* User suggested padding */
                border: 2px solid #e5e7eb; /* Ensure visual border */
                border-radius: 8px;
                box-sizing: border-box;
            }

            .room-header {
                break-after: avoid;
                break-inside: avoid;
            }

            .description {
                break-inside: avoid;
            }
            
            /* User Requested Grid Layout */
            .photos-grid {
                display: grid !important;
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 10px;
                break-inside: avoid; /* Keep grid together if possible */
                page-break-inside: avoid;
                margin-top: 15px;
            }

            .photo-item {
                break-inside: avoid;
                page-break-inside: avoid;
                width: 100%; /* Fill the grid cell */
                margin: 0; /* Grid handles spacing via gap */
            }

            .photo-item img {
                width: 100%;
                height: 150px; /* Fixed height for uniformity */
                object-fit: cover;
                border-radius: 4px;
                border: 1px solid #e5e7eb;
                display: block;
            }
            
            /* Fix Signatures */
            .signature-section {
                break-inside: avoid;
                margin-top: 40px;
            }
          }
          /* ... (rest of styles) ... */
          .photos-grid img {
             /* ... */
          }

          .header h1 {
            color: #2563eb;
            margin: 0 0 10px 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
          }
          .info-item {
            padding: 10px;
            background: #f9fafb;
            border-radius: 5px;
          }
          .info-item strong {
            display: block;
            color: #2563eb;
            margin-bottom: 5px;
          }
          .room-section {
            page-break-inside: avoid;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .room-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          .room-title {
            font-size: 1.2em;
            font-weight: bold;
            color: #1f2937;
          }
          .condition-badge {
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9em;
          }
          .condition-excelente { background: #d1fae5; color: #065f46; }
          .condition-bom { background: #ecfccb; color: #3f6212; }
          .condition-regular { background: #fef3c7; color: #92400e; }
          .condition-ruim { background: #fed7aa; color: #9a3412; }
          .condition-pessimo { background: #fee2e2; color: #991b1b; }
          .description {
            background: #f9fafb;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 15px;
          }
          .photos-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 15px;
          }
          .photos-grid img {
            width: 100%;
            height: 150px;
            object-fit: cover;
            border-radius: 5px;
            border: 1px solid #e5e7eb;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 0.9em;
          }
          .signature-section {
            margin-top: 60px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 40px;
          }
          .signature-line {
            border-top: 1px solid #333;
            padding-top: 10px;
            text-align: center;
          }
          @media print {
            body { padding: 0; }
            .room-section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        
        <!-- Header -->
        <div class="header">
          <h1>LAUDO DE VISTORIA IMOBILIÁRIA</h1>
          <p style="margin: 5px 0; font-size: 1.1em;">
            ${propertyData.inspectionType === 'entrada' ? 'VISTORIA DE ENTRADA' : 'VISTORIA DE SAÍDA'}
          </p>
          <p style="margin: 5px 0; color: #6b7280;">
            Data: ${date}
          </p>
        </div>

        <!-- Property Information -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
            IDENTIFICAÇÃO DO IMÓVEL
          </h2>
          
          <div class="info-grid">
            <div class="info-item">
              <strong>Código do Imóvel</strong>
              ${propertyData.code}
            </div>
            <div class="info-item">
              <strong>Tipo de Imóvel</strong>
              ${this.getPropertyTypeLabel(propertyData.type)}
            </div>
          </div>

          <div class="info-item" style="margin-bottom: 15px;">
            <strong>Endereço Completo</strong>
            ${propertyData.address}, ${propertyData.neighborhood}<br>
            ${propertyData.city} - CEP: ${propertyData.zipCode}
          </div>

          <div class="info-grid">
            <div class="info-item">
              <strong>Quartos</strong>
              ${propertyData.bedrooms || 0}
            </div>
            <div class="info-item">
              <strong>Suítes</strong>
              ${propertyData.suites || 0}
            </div>
            <div class="info-item">
              <strong>Banheiros</strong>
              ${propertyData.bathrooms || 0}
            </div>
            <div class="info-item">
              <strong>Vagas de Garagem</strong>
              ${propertyData.parkingSpaces || 0}
            </div>
          </div>

          ${propertyData.generalNotes ? `
            <div class="info-item" style="margin-top: 15px;">
              <strong>Observações Gerais</strong>
              ${propertyData.generalNotes}
            </div>
          ` : ''}
        </div>

        <!-- Rooms -->
        <div>
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
            VISTORIA POR CÔMODO
          </h2>
          
          ${rooms.map((room, index) => this.generateRoomHTML(room, index + 1)).join('')}
        </div>
        
        <!-- History (Traceability) -->
        ${this.generateHistoryHTML(metadata)}

        <!-- Signatures -->
        <div class="signature-section">
          <div class="signature-line">
            <strong>Vistoriador(a)</strong><br>
            Nome e Assinatura
          </div>
          <div class="signature-line">
            <strong>Responsável pelo Imóvel</strong><br>
            Nome e Assinatura
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Documento gerado por VistoriaApp em ${date}</p>
          <p>Este laudo contém ${rooms.length} cômodo(s) vistoriado(s)</p>
        </div>

      </body>
      </html>
    `;
  },

  /**
   * Generate single room HTML for report
   */
  generateRoomHTML(room, number) {
    const displayName = room.name || Utils.getRoomTypeLabel(room.type);

    return `
    return `
      < div class="room-section" >
        <div class="room-header">
          <div class="room-title">
            ${number}. ${displayName}
          </div>
          <div class="condition-badge condition-${room.condition}">
            ${Utils.getConditionLabel(room.condition)}
          </div>
        </div>

        ${
      room.description ? `
          <div class="description">
            <strong>Descrição Detalhada:</strong><br>
            <span style="white-space: pre-wrap;">${room.description}</span>
          </div>
        ` : ''
    }

        ${
      room.photos && room.photos.length > 0 ? `
          <div style="margin-top: 15px;">
            <strong style="display: block; margin-bottom: 10px; page-break-after: avoid;">Registro Fotográfico (${room.photos.length} foto(s)):</strong>
            <div class="photos-grid">
              ${room.photos.map(photo => `
                <div class="photo-item">
                    <img src="${photo.url || photo.data}" alt="Foto do cômodo" style="width: 100%; border-radius: 4px; border: 1px solid #e5e7eb; display: block;">
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''
    }
      </div >
  `;
  },

  /**
   * Generate history table HTML
   */
  generateHistoryHTML(metadata) {
    if (!metadata) return '';

    const createdAt = metadata.createdAt ? new Date(metadata.createdAt).toLocaleString('pt-BR') : 'N/A';
    const history = metadata.editHistory || [];

    if (history.length === 0 && !metadata.completedAt) return '';

    let historyRows = '';

    // Add creation
    historyRows += `
  < tr >
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${createdAt}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">Criação da Vistoria</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">Sistema</td>
      </tr >
  `;

    // Add history items
    history.forEach(item => {
      historyRows += `
  < tr >
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(item.timestamp).toLocaleString('pt-BR')}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${this.translateAction(item.action)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.user || 'Usuário'}</td>
        </tr >
  `;
    });

    return `
  < div style = "margin-top: 30px; page-break-inside: avoid;" >
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
          HISTÓRICO DA VISTORIA
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
          <thead>
            <tr style="background: #f3f4f6; text-align: left;">
              <th style="padding: 10px; border-bottom: 2px solid #e5e7eb;">Data / Hora</th>
              <th style="padding: 10px; border-bottom: 2px solid #e5e7eb;">Ação</th>
              <th style="padding: 10px; border-bottom: 2px solid #e5e7eb;">Responsável</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
      </div >
  `;
  },

  translateAction(action) {
    const map = {
      'finalized': 'Finalização',
      'reopened': 'Reabertura para Edição',
      'completed': 'Conclusão'
    };
    return map[action] || action;
  },

  /**
   * Show report preview
   */
  showReportPreview(propertyData, rooms, metadata = null) {
    const html = this.generateReportHTML(propertyData, rooms, metadata);
    const container = document.getElementById('reportPreview');
    container.innerHTML = html;
  }
};
