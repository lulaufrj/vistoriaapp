// ============================================
// PDF Generator Module
// ============================================

const PDFGenerator = {
    /**
     * Generate PDF from report HTML
     */
    async generatePDF(propertyData, rooms) {
        try {
            Utils.showNotification('Gerando PDF... Aguarde', 'info');

            // Get the report HTML
            const reportHTML = Report.generateReportHTML(propertyData, rooms);

            // Create a temporary container
            const container = document.createElement('div');
            container.innerHTML = reportHTML;
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.width = '210mm'; // A4 width
            document.body.appendChild(container);

            // Wait for images to load
            const images = container.querySelectorAll('img');
            await Promise.all(Array.from(images).map(img => {
                return new Promise((resolve) => {
                    if (img.complete) {
                        resolve();
                    } else {
                        img.onload = resolve;
                        img.onerror = resolve;
                    }
                });
            }));

            // Generate PDF using html2canvas + jsPDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            // Get all sections that should be on separate pages
            const sections = [container];

            for (let i = 0; i < sections.length; i++) {
                if (i > 0) {
                    pdf.addPage();
                }

                const canvas = await html2canvas(sections[i], {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const imgWidth = 210; // A4 width in mm
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                let heightLeft = imgHeight;
                let position = 0;
                let page = 0;

                while (heightLeft > 0) {
                    if (page > 0) {
                        pdf.addPage();
                    }

                    pdf.addImage(
                        imgData,
                        'JPEG',
                        0,
                        position,
                        imgWidth,
                        imgHeight,
                        undefined,
                        'FAST'
                    );

                    heightLeft -= 297; // A4 height in mm
                    position -= 297;
                    page++;
                }
            }

            // Remove temporary container
            document.body.removeChild(container);

            // Generate filename
            const filename = `Laudo-Vistoria-${Utils.sanitizeFilename(propertyData.code)}-${Utils.formatDateForFilename()}.pdf`;

            // Save PDF
            pdf.save(filename);

            // Mark inspection as completed
            const currentId = Storage.getCurrentInspectionId();
            if (currentId) {
                Storage.markAsCompleted(currentId);
            }

            Utils.showNotification('PDF gerado com sucesso!', 'success');

            return true;
        } catch (error) {
            console.error('Error generating PDF:', error);
            Utils.showNotification('Erro ao gerar PDF. Tente novamente.', 'error');
            return false;
        }
    },

    /**
     * Alternative: Generate simple PDF without html2canvas
     */
    async generateSimplePDF(propertyData, rooms) {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            let yPos = 20;
            const pageWidth = 210;
            const margin = 20;
            const contentWidth = pageWidth - (2 * margin);

            // Helper function to check if we need a new page
            const checkNewPage = (requiredSpace = 10) => {
                if (yPos + requiredSpace > 280) {
                    pdf.addPage();
                    yPos = 20;
                    return true;
                }
                return false;
            };

            // Header
            pdf.setFontSize(20);
            pdf.setTextColor(37, 99, 235);
            pdf.text('LAUDO DE VISTORIA IMOBILIÁRIA', pageWidth / 2, yPos, { align: 'center' });

            yPos += 10;
            pdf.setFontSize(14);
            pdf.text(
                propertyData.inspectionType === 'entrada' ? 'VISTORIA DE ENTRADA' : 'VISTORIA DE SAÍDA',
                pageWidth / 2,
                yPos,
                { align: 'center' }
            );

            yPos += 8;
            pdf.setFontSize(10);
            pdf.setTextColor(100);
            pdf.text(`Data: ${Utils.formatDate()}`, pageWidth / 2, yPos, { align: 'center' });

            yPos += 15;

            // Property Information
            pdf.setFontSize(14);
            pdf.setTextColor(37, 99, 235);
            pdf.text('IDENTIFICAÇÃO DO IMÓVEL', margin, yPos);

            yPos += 8;
            pdf.setFontSize(10);
            pdf.setTextColor(0);

            const propertyInfo = [
                `Código: ${propertyData.code}`,
                `Tipo: ${Report.getPropertyTypeLabel(propertyData.type)}`,
                `Endereço: ${propertyData.address}`,
                `${propertyData.neighborhood}, ${propertyData.city} - CEP: ${propertyData.zipCode}`,
                `Quartos: ${propertyData.bedrooms || 0} | Suítes: ${propertyData.suites || 0} | Banheiros: ${propertyData.bathrooms || 0}`
            ];

            propertyInfo.forEach(info => {
                checkNewPage();
                pdf.text(info, margin, yPos);
                yPos += 6;
            });

            yPos += 10;

            // Rooms
            pdf.setFontSize(14);
            pdf.setTextColor(37, 99, 235);
            checkNewPage(15);
            pdf.text('VISTORIA POR CÔMODO', margin, yPos);
            yPos += 10;

            rooms.forEach((room, index) => {
                checkNewPage(20);

                const displayName = room.name || Utils.getRoomTypeLabel(room.type);

                pdf.setFontSize(12);
                pdf.setTextColor(0);
                pdf.text(`${index + 1}. ${displayName}`, margin, yPos);

                pdf.setFontSize(9);
                pdf.setTextColor(100);
                pdf.text(`Estado: ${Utils.getConditionLabel(room.condition)}`, margin + 100, yPos);

                yPos += 7;

                if (room.description) {
                    pdf.setFontSize(9);
                    pdf.setTextColor(0);
                    const lines = pdf.splitTextToSize(room.description, contentWidth);
                    lines.forEach(line => {
                        checkNewPage();
                        pdf.text(line, margin + 5, yPos);
                        yPos += 5;
                    });
                }



                if (room.photos && room.photos.length > 0) {
                    checkNewPage();
                    pdf.setFontSize(8);
                    pdf.setTextColor(100);
                    pdf.text(`Fotos: ${room.photos.length}`, margin + 5, yPos);
                    yPos += 5;
                }

                yPos += 8;
            });

            // Footer
            checkNewPage(30);
            yPos += 20;
            pdf.setDrawColor(200);
            pdf.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 10;

            pdf.setFontSize(10);
            pdf.setTextColor(0);
            pdf.text('_______________________________', margin + 20, yPos);
            pdf.text('_______________________________', pageWidth / 2 + 10, yPos);
            yPos += 5;
            pdf.text('Vistoriador(a)', margin + 35, yPos);
            pdf.text('Responsável pelo Imóvel', pageWidth / 2 + 20, yPos);

            // Generate filename
            const filename = `Laudo-Vistoria-${Utils.sanitizeFilename(propertyData.code)}-${Utils.formatDateForFilename()}.pdf`;

            // Save PDF
            pdf.save(filename);

            Utils.showNotification('PDF gerado com sucesso!', 'success');
            return true;
        } catch (error) {
            console.error('Error generating simple PDF:', error);
            Utils.showNotification('Erro ao gerar PDF', 'error');
            return false;
        }
    }
};
