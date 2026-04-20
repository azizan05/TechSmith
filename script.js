/* =====================================================
   script.js — TechSmith Store
   - Cart disimpan di localStorage agar lintas halaman
   - Cart icon di semua halaman → cart.html
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    // ================= SHARED: Update badge keranjang =================
    updateCartBadge();

    // Cart icon semua halaman → cart.html (kecuali cart.html itu sendiri)
    const cartIcon = document.querySelector("#cart-icon");
    if (cartIcon && !document.querySelector(".cart-page-wrapper")) {
        cartIcon.addEventListener("click", () => {
            window.location.href = "cart.html";
        });
    }

    // ================= PRODUCT PAGE =================
    const addCartButtons = document.querySelectorAll(".add-cart");

    if (addCartButtons.length > 0) {
        addCartButtons.forEach(button => {
            button.addEventListener("click", event => {
                const productBox = event.target.closest(".content");
                addToCartLS(productBox);
            });
        });

        // Tombol "Buy Now" di sidebar cart lama (jika masih ada)
        const buyNowButton = document.querySelector(".btn-buy");
        if (buyNowButton) {
            buyNowButton.addEventListener("click", () => {
                window.location.href = "cart.html";
            });
        }

        // Sidebar cart lama: tetap fungsional jika ada di DOM
        const cartEl    = document.querySelector(".cart");
        const cartClose = document.querySelector("#cart-close");
        if (cartEl && cartClose) {
            cartClose.addEventListener("click", () => cartEl.classList.remove("active"));
        }
    }

    // ================= CART PAGE =================
    if (document.querySelector(".cart-page-wrapper")) {
        initCartPage();
    }

    // ================= CHECKOUT PAGE =================
    const checkoutItemsList = document.querySelector("#checkout-items-list");
    if (checkoutItemsList) {
        initCheckoutPage();
    }

    // ================= HISTORY PAGE =================
    if (document.getElementById("order-list")) {
        initHistoryPage();
    }

    // ================= PAYMENT OPTIONS =================
    document.querySelectorAll(".payment-option").forEach(option => {
        option.addEventListener("click", () => selectPayment(option));
    });
});

/* ─────────────────────────────────────────────────────
   CART DATA  (localStorage key: "techsmith_cart")
   Struktur item: { id, brand, name, price, img, qty }
───────────────────────────────────────────────────── */

function getCart() {
    return JSON.parse(localStorage.getItem("techsmith_cart") || "[]");
}

function saveCart(cart) {
    localStorage.setItem("techsmith_cart", JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const cart  = getCart();
    const total = cart.reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll(".cart-item-count").forEach(badge => {
        if (total > 0) {
            badge.style.visibility = "visible";
            badge.textContent = total;
        } else {
            badge.style.visibility = "hidden";
            badge.textContent = "";
        }
    });
}

function addToCartLS(productBox) {
    if (!productBox) return;

    const imgEl  = productBox.querySelector("img");
    // Ambil src asli (attribute), bukan .src yang sudah jadi URL absolut
    const img    = imgEl ? (imgEl.getAttribute("src") || imgEl.src || "") : "";
    const brand  = productBox.querySelector(".brand")?.textContent.trim() || "";
    const name   = productBox.querySelector(".nama")?.textContent.trim()  || "";

    if (!name) return; // guard: jangan simpan item tanpa nama

    // Ambil harga: prioritas diskon, lalu nodisc, lalu cek semua span dalam .price
    const diskonEl = productBox.querySelector(".diskon");
    const nodiscEl = productBox.querySelector(".nodisc");
    const anySpan  = productBox.querySelector(".price span");
    const price    = (diskonEl?.textContent.trim())
                  || (nodiscEl?.textContent.trim())
                  || (anySpan?.textContent.trim())
                  || "Rp. 0";

    const cart = getCart();
    const exist = cart.find(i => i.name === name);
    if (exist) {
        exist.qty++;
    } else {
        cart.push({ id: Date.now(), brand, name, price, img, qty: 1 });
    }
    saveCart(cart);

    // Feedback visual tombol
    const btn = productBox.querySelector(".add-cart");
    if (btn) {
        const orig = btn.className;
        btn.className = btn.className.replace("ri-shopping-bag-4-line", "ri-check-line");
        btn.style.background = "#00a651";
        setTimeout(() => {
            btn.className = orig;
            btn.style.background = "";
        }, 900);
    }
}

/* ─────────────────────────────────────────────────────
   CART PAGE  (cart.html)
───────────────────────────────────────────────────── */

function initCartPage() {
    renderCartPage();

    // Select all
    document.getElementById("select-all").addEventListener("change", function () {
        document.querySelectorAll(".item-checkbox").forEach(cb => cb.checked = this.checked);
        recalcSummary();
    });

    // Hapus dipilih
    document.getElementById("btn-delete-selected").addEventListener("click", () => {
        const checked = [...document.querySelectorAll(".item-checkbox:checked")];
        if (checked.length === 0) { alert("Pilih item yang ingin dihapus."); return; }

        const names = checked.map(cb => cb.dataset.name);
        const cart  = getCart().filter(i => !names.includes(i.name));
        saveCart(cart);
        renderCartPage();
    });

    // Checkout
    document.getElementById("btn-checkout").addEventListener("click", () => {
        const checked = [...document.querySelectorAll(".item-checkbox:checked")];
        if (checked.length === 0) { alert("Pilih minimal 1 produk untuk checkout."); return; }

        const selectedNames = checked.map(cb => cb.dataset.name);
        const cart          = getCart();
        const selected      = cart
            .filter(i => selectedNames.includes(i.name))
            .map(i => ({ title: i.name, price: i.price, qty: String(i.qty), img: i.img }));

        localStorage.setItem("checkoutItems", JSON.stringify(selected));
        window.location.href = "checkout.html";
    });
}

function renderCartPage() {
    const cart      = getCart();
    const listEl    = document.getElementById("cart-items-list");
    const emptyEl   = document.getElementById("cart-empty");
    const selectBar = document.getElementById("cart-select-bar");
    const summPanel = document.getElementById("cart-summary-panel");

    listEl.innerHTML = "";

    if (cart.length === 0) {
        emptyEl.style.display    = "block";
        selectBar.style.display  = "none";
        summPanel.style.display  = "none";
        document.querySelector(".cart-layout")?.classList.add("is-empty");
        return;
    }

    emptyEl.style.display    = "none";
    selectBar.style.display  = "flex";
    summPanel.style.display  = "flex";
    document.querySelector(".cart-layout")?.classList.remove("is-empty");

    cart.forEach(item => {
        const card = document.createElement("div");
        card.classList.add("cart-item-card");
        card.dataset.name = item.name;

        card.innerHTML = `
            <input type="checkbox" class="item-checkbox" data-name="${item.name}" checked>
            <div class="cart-item-img-wrap">
                <img src="${item.img}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/90'">
            </div>
            <div class="cart-item-info">
                <div class="cart-item-brand">${item.brand}</div>
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${item.price}</div>
            </div>
            <div class="cart-item-controls">
                <div class="qty-control">
                    <button class="qty-btn btn-dec" type="button">−</button>
                    <span class="qty-number">${item.qty}</span>
                    <button class="qty-btn btn-inc" type="button">+</button>
                </div>
                <button class="btn-remove-item" type="button" title="Hapus produk">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        `;

        // Qty decrement
        card.querySelector(".btn-dec").addEventListener("click", () => {
            const c = getCart();
            const t = c.find(i => i.name === item.name);
            if (!t) return;
            if (t.qty > 1) { t.qty--; saveCart(c); }
            else { saveCart(c.filter(i => i.name !== item.name)); }
            renderCartPage();
        });

        // Qty increment
        card.querySelector(".btn-inc").addEventListener("click", () => {
            const c = getCart();
            const t = c.find(i => i.name === item.name);
            if (t) { t.qty++; saveCart(c); }
            renderCartPage();
        });

        // Remove
        card.querySelector(".btn-remove-item").addEventListener("click", () => {
            saveCart(getCart().filter(i => i.name !== item.name));
            renderCartPage();
        });

        // Checkbox
        card.querySelector(".item-checkbox").addEventListener("change", () => {
            syncSelectAll();
            recalcSummary();
        });

        listEl.appendChild(card);
    });

    syncSelectAll();
    recalcSummary();
}

function syncSelectAll() {
    const all     = document.querySelectorAll(".item-checkbox");
    const checked = document.querySelectorAll(".item-checkbox:checked");
    const selAll  = document.getElementById("select-all");
    if (selAll) selAll.checked = all.length > 0 && all.length === checked.length;
}

function recalcSummary() {
    const checked = [...document.querySelectorAll(".item-checkbox:checked")];
    const cart    = getCart();

    let subtotal = 0;
    let count    = 0;

    checked.forEach(cb => {
        const item = cart.find(i => i.name === cb.dataset.name);
        if (!item) return;
        // Hapus semua karakter non-digit (Rp, titik, koma, spasi, dll)
        const priceNum = parseInt(item.price.replace(/[^\d]/g, ""), 10) || 0;
        subtotal += priceNum * item.qty;
        count    += item.qty;
    });

    const countEl    = document.getElementById("summary-count");
    const subtotalEl = document.getElementById("summary-subtotal");
    const totalEl    = document.getElementById("summary-total");
    const checkoutBtn = document.getElementById("btn-checkout");

    if (countEl)    countEl.textContent    = count + " item";
    if (subtotalEl) subtotalEl.textContent = formatRp(subtotal);
    if (totalEl)    totalEl.textContent    = formatRp(subtotal);
    if (checkoutBtn) checkoutBtn.disabled  = count === 0;
}

/* ─────────────────────────────────────────────────────
   CHECKOUT PAGE
───────────────────────────────────────────────────── */

function initCheckoutPage() {
    const checkoutItems     = JSON.parse(localStorage.getItem("checkoutItems")) || [];
    const checkoutItemsList = document.querySelector("#checkout-items-list");
    const breakdown         = document.querySelector("#price-breakdown");
    const subtotalEl        = document.querySelector("#summary-subtotal");
    const totalEl           = document.querySelector("#summary-total");
    const discountEl        = document.querySelector("#summary-discount");
    const cartDataField     = document.querySelector("#cart-data-field");

    let summaryText = "";
    let subtotal    = 0;

    if (checkoutItems.length === 0) {
        checkoutItemsList.innerHTML = `
            <div class="empty-checkout">
                <i class="ri-shopping-bag-3-line"></i>
                <p>Keranjang kamu kosong.<br>Silakan pilih produk terlebih dahulu.</p>
            </div>`;
        if (breakdown) breakdown.style.display = "none";
    } else {
        checkoutItemsList.innerHTML = "";
        checkoutItems.forEach((item, i) => {
            const harga     = parseInt(item.price.replace(/[^\d]/g, ""), 10);
            const qty       = parseInt(item.qty, 10);
            const lineTotal = harga * qty;
            subtotal       += lineTotal;

            const el = document.createElement("div");
            el.classList.add("checkout-item");
            el.innerHTML = `
                <img src="${item.img || ""}" alt="${item.title}">
                <div class="checkout-item-info">
                    <div class="checkout-item-name">${item.title}</div>
                    <div class="checkout-item-qty">x${qty}</div>
                </div>
                <div class="checkout-item-price">Rp. ${lineTotal.toLocaleString("id-ID")}</div>
            `;
            checkoutItemsList.appendChild(el);
            summaryText += `${i + 1}. ${item.title} x${qty} - Rp. ${lineTotal.toLocaleString("id-ID")}\n`;
        });

        if (breakdown) breakdown.style.display = "block";
        if (subtotalEl)  subtotalEl.textContent = "Rp. " + subtotal.toLocaleString("id-ID");
        if (discountEl)  discountEl.textContent = "- Rp 0";
        if (totalEl)     totalEl.textContent    = "Rp. " + subtotal.toLocaleString("id-ID");
        if (cartDataField) cartDataField.value  = summaryText.trim();
    }

    const submitBtn = document.querySelector("#btn-submit-order");
    if (submitBtn) submitBtn.addEventListener("click", submitCheckout);
}

/* ─────────────────────────────────────────────────────
   PAYMENT
───────────────────────────────────────────────────── */

function selectPayment(label) {
    document.querySelectorAll(".payment-option").forEach(el => el.classList.remove("selected"));
    label.classList.add("selected");
    const radio = label.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
}

/* ─────────────────────────────────────────────────────
   SUBMIT CHECKOUT
───────────────────────────────────────────────────── */

function submitCheckout() {
    const checkoutItems = JSON.parse(localStorage.getItem("checkoutItems")) || [];
    if (checkoutItems.length === 0) { alert("Tidak ada barang yang dipilih."); return; }

    const firstName = document.getElementById("first-name")?.value.trim() || "";
    const lastName  = document.getElementById("last-name")?.value.trim()  || "";
    const email     = document.getElementById("email")?.value.trim()      || "";
    const phone     = document.getElementById("phone")?.value.trim()      || "";
    const address   = document.getElementById("address")?.value.trim()    || "";
    const city      = document.getElementById("city")?.value.trim()       || "";
    const postal    = document.getElementById("postal")?.value.trim()     || "";
    const province  = document.getElementById("province")?.value          || "";
    const notes     = document.getElementById("notes")?.value.trim()      || "";

    if (!firstName || !email || !phone || !address || !city || !postal || !province) {
        alert("Harap lengkapi semua field yang wajib diisi (*)."); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert("Format email tidak valid."); return;
    }

    const selectedPayment = document.querySelector('input[name="payment"]:checked');
    const paymentMethod   = selectedPayment ? selectedPayment.value : "Transfer Bank";

    const normalizedItems = checkoutItems.map(item => ({
        name    : item.title,
        price   : item.price,
        quantity: parseInt(item.qty, 10),
        img     : item.img || ""
    }));

    const total = normalizedItems.reduce((sum, item) => {
        return sum + (parseInt(String(item.price).replace(/[^\d]/g, ""), 10) || 0) * item.quantity;
    }, 0);

    const newOrder = {
        orderId  : "TS-" + Date.now().toString().slice(-6),
        orderDate: new Date().toLocaleString("id-ID"),
        status   : "Diproses",
        payment  : paymentMethod,
        total,
        items    : normalizedItems,
        customer : {
            name   : `${firstName} ${lastName}`.trim(),
            email, phone, notes,
            address: `${address}, ${city}, ${province}, ${postal}`
        }
    };

    const history = JSON.parse(localStorage.getItem("techsmith_history") || "[]");
    history.unshift(newOrder);
    localStorage.setItem("techsmith_history", JSON.stringify(history));

    // Hapus checkoutItems & kosongkan cart untuk item yg sudah dibeli
    localStorage.removeItem("checkoutItems");

    const successOrderId = document.getElementById("success-order-id");
    const successOverlay = document.getElementById("success-overlay");
    if (successOrderId) successOrderId.textContent = "Order ID: #" + newOrder.orderId;
    if (successOverlay) {
        successOverlay.classList.add("show");
    } else {
        alert("Checkout berhasil!");
        window.location.href = "history.html";
    }
}

/* ─────────────────────────────────────────────────────
   HISTORY PAGE
───────────────────────────────────────────────────── */

let allOrders = [];

function initHistoryPage() {
    loadHistory();

    // Expose functions to inline onclick attributes in history.html
    window.filterOrders    = filterOrders;
    window.confirmClearAll = confirmClearAll;
    window.clearAllHistory = clearAllHistory;
    window.closeModal      = closeModal;
    window.toggleDetail    = toggleDetail;
}

function loadHistory() {
    allOrders = JSON.parse(localStorage.getItem("techsmith_history") || "[]");
    renderStats();
    renderOrders(allOrders);

    const statsBar  = document.getElementById("stats-bar");
    const filterBar = document.getElementById("filter-bar");
    if (statsBar)  statsBar.style.display  = allOrders.length > 0 ? "grid" : "none";
    if (filterBar) filterBar.style.display = allOrders.length > 0 ? "flex"  : "none";
}

function renderStats() {
    const totalSpend = allOrders.reduce((s, o) => s + o.total, 0);
    const totalItems = allOrders.reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0);
    const el = id => document.getElementById(id);
    if (el("stat-total")) el("stat-total").textContent = allOrders.length;
    if (el("stat-spend")) el("stat-spend").textContent = formatRp(totalSpend);
    if (el("stat-items")) el("stat-items").textContent = totalItems + " item";
}

function filterOrders(filter, btn) {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const filtered = filter === "semua"
        ? allOrders
        : allOrders.filter(o => o.status.toLowerCase() === filter.toLowerCase());
    renderOrders(filtered);
}

function renderOrders(orders) {
    const list = document.getElementById("order-list");
    if (!list) return;

    if (orders.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="ri-file-list-3-line"></i>
                <h3>Belum Ada Transaksi</h3>
                <p>Riwayat pembelian kamu akan muncul di sini.</p>
                <a href="product.html" class="btn-go-shop"><i class="ri-store-2-line"></i> Belanja Sekarang</a>
            </div>`;
        return;
    }

    list.innerHTML = "";
    orders.forEach(order => {
        const statusClass  = "status-" + order.status.toLowerCase().replace(" ", "");
        const shown        = order.items.slice(0, 3);
        const more         = order.items.length - 3;

        const thumbsHTML = shown.map(item => `
            <div class="order-item-thumb">
                <img src="${item.img}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/60'">
                <span>${item.name.length > 12 ? item.name.slice(0, 12) + "…" : item.name}</span>
            </div>
        `).join("") + (more > 0 ? `<div class="order-item-thumb"><div class="more-badge">+${more}</div></div>` : "");

        const tableRowsHTML = order.items.map(item => {
            const price = parseInt(item.price.replace(/[^\d]/g, ""), 10);
            return `
                <tr>
                    <td>
                        <img src="${item.img}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/40'">
                        ${item.name}
                    </td>
                    <td>${item.price}</td>
                    <td style="text-align:center">${item.quantity}</td>
                    <td style="font-weight:700;color:#0033ff">${formatRp(price * item.quantity)}</td>
                </tr>`;
        }).join("");

        const card = document.createElement("div");
        card.classList.add("order-card");
        card.dataset.orderId = order.orderId;
        card.innerHTML = `
            <div class="order-header">
                <i class="ri-receipt-line" style="color:#0033ff;font-size:18px"></i>
                <span class="order-id">#${order.orderId}</span>
                <span class="order-date"><i class="ri-calendar-line"></i> ${order.orderDate}</span>
                <span class="order-status ${statusClass}">${order.status}</span>
            </div>
            <div class="order-body">
                <div class="order-items-row">${thumbsHTML}</div>
                <div class="order-info-row">
                    <div class="order-info-item">
                        <span class="order-info-label">Total Pembayaran</span>
                        <span class="order-info-value order-total-value">${formatRp(order.total)}</span>
                    </div>
                    <div class="order-info-item">
                        <span class="order-info-label">Metode Bayar</span>
                        <span class="order-info-value">${order.payment}</span>
                    </div>
                    <div class="order-info-item">
                        <span class="order-info-label">Jumlah Produk</span>
                        <span class="order-info-value">${order.items.reduce((s, i) => s + i.quantity, 0)} item</span>
                    </div>
                </div>
                <button class="expand-btn" onclick="toggleDetail(this, '${order.orderId}')">
                    <i class="ri-arrow-down-s-line"></i> Lihat Detail Pesanan
                </button>
                <table class="order-detail-table" id="table-${order.orderId}">
                    <thead><tr>
                        <th>Produk</th><th>Harga</th>
                        <th style="text-align:center">Qty</th><th>Subtotal</th>
                    </tr></thead>
                    <tbody>${tableRowsHTML}</tbody>
                </table>
                <div class="shipping-card" id="ship-${order.orderId}">
                    <strong><i class="ri-map-pin-line"></i> Informasi Pengiriman</strong>
                    <div class="shipping-grid">
                        <div class="sh-row">
                            <span class="sh-label">Nama Penerima</span>
                            <span class="sh-val">${order.customer.name}</span>
                        </div>
                        <div class="sh-row">
                            <span class="sh-label">No. Handphone</span>
                            <span class="sh-val">${order.customer.phone}</span>
                        </div>
                        <div class="sh-row" style="grid-column:1/-1">
                            <span class="sh-label">Alamat</span>
                            <span class="sh-val">${order.customer.address}</span>
                        </div>
                        <div class="sh-row">
                            <span class="sh-label">Email</span>
                            <span class="sh-val">${order.customer.email}</span>
                        </div>
                        ${order.customer.notes ? `
                        <div class="sh-row">
                            <span class="sh-label">Catatan</span>
                            <span class="sh-val">${order.customer.notes}</span>
                        </div>` : ""}
                    </div>
                </div>
            </div>`;

        list.appendChild(card);
    });
}

function toggleDetail(btn, orderId) {
    const table  = document.getElementById("table-" + orderId);
    const ship   = document.getElementById("ship-"  + orderId);
    const isOpen = table.classList.contains("open");
    table.classList.toggle("open", !isOpen);
    ship.classList.toggle("open",  !isOpen);
    btn.innerHTML = isOpen
        ? `<i class="ri-arrow-down-s-line"></i> Lihat Detail Pesanan`
        : `<i class="ri-arrow-up-s-line"></i> Sembunyikan Detail`;
}

function confirmClearAll() {
    document.getElementById("delete-modal").classList.add("show");
}
function closeModal() {
    document.getElementById("delete-modal").classList.remove("show");
}
function clearAllHistory() {
    localStorage.removeItem("techsmith_history");
    allOrders = [];
    closeModal();
    const statsBar  = document.getElementById("stats-bar");
    const filterBar = document.getElementById("filter-bar");
    if (statsBar)  statsBar.style.display  = "none";
    if (filterBar) filterBar.style.display = "none";
    renderOrders([]);
}

/* ─────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────── */

function formatRp(num) {
    return "Rp " + num.toLocaleString("id-ID");
}
