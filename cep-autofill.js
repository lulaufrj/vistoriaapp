// ============================================
// CEP Auto-fill Module
// ============================================

const CEPAutoFill = {
    /**
     * Initialize CEP auto-fill
     */
    init() {
        const zipCodeInput = document.getElementById('zipCode');

        if (zipCodeInput) {
            // Format CEP as user types
            zipCodeInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');

                if (value.length > 5) {
                    value = value.substring(0, 5) + '-' + value.substring(5, 8);
                }

                e.target.value = value;
            });

            // Fetch address when CEP is complete
            zipCodeInput.addEventListener('blur', async (e) => {
                const cep = e.target.value.replace(/\D/g, '');

                if (cep.length === 8) {
                    await this.fetchAddress(cep);
                }
            });
        }
    },

    /**
     * Fetch address from ViaCEP API
     */
    async fetchAddress(cep) {
        try {
            // Show loading state
            const zipCodeInput = document.getElementById('zipCode');
            const originalPlaceholder = zipCodeInput.placeholder;
            zipCodeInput.placeholder = 'Buscando endereço...';
            zipCodeInput.disabled = true;

            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

            if (!response.ok) {
                throw new Error('Erro ao buscar CEP');
            }

            const data = await response.json();

            if (data.erro) {
                Utils.showNotification('CEP não encontrado', 'error');
                return;
            }

            // Fill address fields
            this.fillAddressFields(data);

            Utils.showNotification('Endereço preenchido automaticamente!', 'success');

        } catch (error) {
            console.error('Error fetching CEP:', error);
            Utils.showNotification('Erro ao buscar CEP. Verifique a conexão.', 'error');
        } finally {
            // Restore input state
            const zipCodeInput = document.getElementById('zipCode');
            zipCodeInput.placeholder = '00000-000';
            zipCodeInput.disabled = false;
        }
    },

    /**
     * Fill address fields with API data
     */
    fillAddressFields(data) {
        // Address (logradouro)
        const addressInput = document.getElementById('address');
        if (addressInput && data.logradouro) {
            addressInput.value = data.logradouro;
            // Trigger change event for auto-save
            addressInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Neighborhood (bairro)
        const neighborhoodInput = document.getElementById('neighborhood');
        if (neighborhoodInput && data.bairro) {
            neighborhoodInput.value = data.bairro;
            neighborhoodInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // City (localidade)
        const cityInput = document.getElementById('city');
        if (cityInput && data.localidade) {
            cityInput.value = data.localidade;
            cityInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // State (uf) - if you have a state field
        const stateInput = document.getElementById('state');
        if (stateInput && data.uf) {
            stateInput.value = data.uf;
            stateInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Focus on the number field after auto-filling
        const numberInput = document.getElementById('addressNumber');
        if (numberInput) {
            setTimeout(() => {
                numberInput.focus();
            }, 100);
        }
    },

    /**
     * Clear address fields
     */
    clearAddressFields() {
        document.getElementById('address').value = '';
        document.getElementById('neighborhood').value = '';
        document.getElementById('city').value = '';

        const stateInput = document.getElementById('state');
        if (stateInput) {
            stateInput.value = '';
        }
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    CEPAutoFill.init();
});
