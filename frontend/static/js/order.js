const PRODUCTS = {
    bambi: {
        id: 'bambi',
        name: 'Bambi',
        price: 6500,
        available: true,
        images: ['/static/img/bambi_1.webp',
                '/static/img/bambi_2.webp',
                '/static/img/bambi_3.webp',
                '/static/img/bambi_4.webp',
                '/static/img/bambi_rabbit_5.webp'],
    },
    rabbit: {
        id: 'rabbit',
        name: 'Rabbit',
        price: 5500,
        available: true,
        images: ['/static/img/rabbit_1.webp', 
                '/static/img/rabbit_2.webp',
                '/static/img/rabbit_3.webp',
                '/static/img/rabbit_4.webp',
                '/static/img/bambi_rabbit_5.webp']
    },
};

const SIZES = ['XS', 'S', 'M', 'L'];
const cart = [];
let currentProduct = null;
let selectedSize = null;
let currentImageIndex = 0;

const productModal = document.querySelector('#product-modal');
const cartModal = document.querySelector('#cart-modal');
const checkoutModal = document.querySelector('#checkout-modal');
const floatingCart = document.querySelector('#floating-cart');
const checkoutForm = document.querySelector('#checkout-form');
const CART_STORAGE_KEY = 'eliora_cart';
const productModalImage = document.querySelector('#product-modal-image');
const galleryDots = document.querySelector('#gallery-dots');

const formatPrice = (price) => `${price.toLocaleString('ru-RU')} ₽`;

function setModalState(modal, isOpen) {
    modal.classList.toggle('is-open', isOpen);
    modal.setAttribute('aria-hidden', String(!isOpen));
    document.body.classList.toggle('modal-open', isOpen);
}

function closeModals() {
    document.querySelectorAll('.modal.is-open').forEach((modal) => {
        setModalState(modal, false);
    });
}

function openProductModal(productId) {
    currentProduct = PRODUCTS[productId];
    selectedSize = null;
    currentImageIndex = 0;
    if (!currentProduct) return;

    renderGallery();
    document.querySelector('#product-modal-title').textContent = currentProduct.name;
    document.querySelector('#product-modal-eyebrow').textContent = currentProduct.available
        ? 'PRE-ORDER'
        : 'OUT OF STOCK';
    document.querySelector('#product-modal-price').textContent = formatPrice(currentProduct.price);
    document.querySelector('#product-modal-status').textContent = currentProduct.available
        ? ''
        : 'Нет в наличии. Сейчас товар доступен только для просмотра.';
    document.querySelector('#size-options').innerHTML = SIZES.map((size) => (
        `<button type="button" class="size-option" data-size="${size}"${currentProduct.available ? '' : ' disabled'}>${size}</button>`
    )).join('');
    const addButton = document.querySelector('#add-to-cart');
    addButton.disabled = !currentProduct.available;
    addButton.textContent = currentProduct.available ? 'Добавить в корзину' : 'Нет в наличии';
    setModalState(productModal, true);
}

function renderGallery() {
    const image = currentProduct.images[currentImageIndex];
    productModalImage.src = image;
    productModalImage.alt = `Худи ${currentProduct.name}, фото ${currentImageIndex + 1}`;
    galleryDots.innerHTML = currentProduct.images.map((_, index) => (
        `<button type="button" class="gallery__dot${index === currentImageIndex ? ' is-selected' : ''}" data-gallery-index="${index}" aria-label="Фото ${index + 1}"></button>`
    )).join('');
}

function showGalleryImage(index) {
    currentImageIndex = (index + currentProduct.images.length) % currentProduct.images.length;
    renderGallery();
}

function renderCart() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    floatingCart.querySelector('.cart-count').textContent = count;
    floatingCart.classList.toggle('is-hidden', count === 0);
    document.querySelector('#cart-total').textContent = formatPrice(total);

    const items = document.querySelector('#cart-items');
    items.innerHTML = cart.length
        ? cart.map((item, index) => `
            <div class="cart-item">
                <img src="${item.image}" alt="Худи ${item.name}">
                <div>
                    <strong>${item.name}</strong>
                    <span>Размер: ${item.size}</span>
                    <span>${formatPrice(item.price)} · ${item.quantity} шт.</span>
                    <button type="button" class="cart-item__remove" data-remove-index="${index}">Удалить</button>
                </div>
            </div>
        `).join('')
        : '<p class="cart-empty">Корзина пуста</p>';
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function addCurrentProduct() {
    const status = document.querySelector('#product-modal-status');
    if (!currentProduct.available) {
        status.textContent = 'Нет в наличии. Сейчас товар доступен только для просмотра.';
        return;
    }
    if (!selectedSize) {
        status.textContent = 'Выберите размер.';
        return;
    }

    const existing = cart.find((item) => (
        item.id === currentProduct.id && item.size === selectedSize
    ));
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            image: currentProduct.images[0],
            size: selectedSize,
            quantity: 1,
        });
    }
    renderCart();
    setModalState(productModal, false);
    status.textContent = '';
}

document.querySelectorAll('.product').forEach((card) => {
    card.addEventListener('click', (event) => {
        openProductModal(card.dataset.product);
    });
    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openProductModal(card.dataset.product);
        }
    });
});

document.addEventListener('click', (event) => {
    const sizeButton = event.target.closest('.size-option');
    if (sizeButton) {
        selectedSize = sizeButton.dataset.size;
        document.querySelectorAll('.size-option').forEach((button) => {
            button.classList.toggle('is-selected', button === sizeButton);
        });
    }

    const galleryButton = event.target.closest('[data-gallery-index]');
    if (galleryButton) {
        showGalleryImage(Number(galleryButton.dataset.galleryIndex));
    }

    const removeButton = event.target.closest('[data-remove-index]');
    if (removeButton) {
        cart.splice(Number(removeButton.dataset.removeIndex), 1);
        renderCart();
    }

    if (event.target.closest('[data-close-modal]')) {
        closeModals();
    }
});

floatingCart.addEventListener('click', () => {
    renderCart();
    setModalState(cartModal, true);
});

document.querySelector('#add-to-cart').addEventListener('click', addCurrentProduct);
document.querySelector('#gallery-prev').addEventListener('click', () => {
    showGalleryImage(currentImageIndex - 1);
});
document.querySelector('#gallery-next').addEventListener('click', () => {
    showGalleryImage(currentImageIndex + 1);
});

document.querySelector('#checkout-button').addEventListener('click', () => {
    if (!cart.length) return;
    document.querySelector('#checkout-summary').textContent = cart
        .map((item) => `${item.name}, ${item.size} — ${item.quantity} шт.`)
        .join(' · ');
    setModalState(cartModal, false);
    setModalState(checkoutModal, true);
});

checkoutForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = checkoutForm.querySelector('button[type="submit"]');
    const status = document.querySelector('#checkout-status');
    const data = new FormData(checkoutForm);
    const payload = {
        name: data.get('name').trim(),
        phone: data.get('phone').trim(),
        telegram: data.get('telegram').trim(),
        address: data.get('address').trim(),
        timestamp: new Date().toISOString(),
        items: cart.map((item) => ({
            name: item.name,
            size: item.size,
            quantity: item.quantity,
            price: formatPrice(item.price),
        })),
    };

    button.disabled = true;
    status.textContent = 'Отправляем заявку...';
    try {
        const response = await fetch('/api/submit-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Не удалось отправить заявку.');
        }
        cart.length = 0;
        renderCart();
        checkoutForm.reset();
        status.textContent = 'Заявка отправлена. Мы скоро свяжемся с вами.';
        setTimeout(closeModals, 1800);
    } catch (error) {
        status.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModals();
    });
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModals();
});

try {
    const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
    if (Array.isArray(savedCart)) {
        savedCart.forEach((item) => {
            if (
                PRODUCTS[item.id]
                && PRODUCTS[item.id].available
                && SIZES.includes(item.size)
                && Number.isInteger(item.quantity)
                && item.quantity > 0
            ) {
                cart.push({
                    id: PRODUCTS[item.id].id,
                    name: PRODUCTS[item.id].name,
                    price: PRODUCTS[item.id].price,
                    image: PRODUCTS[item.id].images[0],
                    size: item.size,
                    quantity: item.quantity,
                });
            }
        });
    }
} catch (error) {
    localStorage.removeItem(CART_STORAGE_KEY);
}

renderCart();

const revealElements = document.querySelectorAll('.reveal');
const revealVisibleElements = () => {
    revealElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
            element.classList.add('is-visible');
        }
    });
};

if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-ready');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12 });

    revealElements.forEach((element) => revealObserver.observe(element));
    revealVisibleElements();
    window.addEventListener('scroll', revealVisibleElements, { passive: true });
} else {
    revealElements.forEach((element) => element.classList.add('is-visible'));
}
