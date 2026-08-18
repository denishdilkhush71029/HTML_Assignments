// Dummy Product Data
const products = [
    { id: 1, title: "POCO M8x 5G", price: "₹12,999", category: "Mobiles", img: "https://via.placeholder.com/150/0000FF/808080?text=POCO+5G" },
    { id: 2, title: "Fully Automatic Washing Machine", price: "₹9,990", category: "Appliances", img: "https://via.placeholder.com/150/FF0000/FFFFFF?text=Washing+Machine" },
    { id: 3, title: "Men's Casual Shirt", price: "₹499", category: "Fashion", img: "https://via.placeholder.com/150/008000/FFFFFF?text=Shirt" },
    { id: 4, title: "Gaming Laptop i5", price: "₹49,990", category: "Electronics", img: "https://via.placeholder.com/150/FFFF00/000000?text=Laptop" },
    { id: 5, title: "Smart TV 43 Inch", price: "₹18,499", category: "Appliances", img: "https://via.placeholder.com/150/800080/FFFFFF?text=Smart+TV" },
    { id: 6, title: "Wireless Headphones", price: "₹1,299", category: "Electronics", img: "https://via.placeholder.com/150/00FFFF/000000?text=Headphones" }
];

// Render Products Dynamically
function displayProducts(items) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';
    
    if (items.length === 0) {
        grid.innerHTML = '<p>No products found!</p>';
        return;
    }

    items.forEach(product => {
        grid.innerHTML += `
            <div class="product-card">
                <img src="${product.img}" class="product-img" alt="${product.title}">
                <div class="product-title">${product.title}</div>
                <div class="product-price">${product.price}</div>
                <button class="add-cart-btn" onclick="addToCart(${product.id})">Add to Cart</button>
            </div>
        `;
    });
}

// Initial Load
displayProducts(products);

// Search Filter Logic
document.getElementById('searchInput').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    const filtered = products.filter(p => p.title.toLowerCase().includes(query) || p.category.toLowerCase().includes(query));
    displayProducts(filtered);
});

// Category Filter Logic
function filterCategory(cat) {
    if (cat === 'all') {
        displayProducts(products);
    } else {
        const filtered = products.filter(p => p.category === cat);
        displayProducts(filtered);
    }
}

// Banner Carousel Logic
let currentSlide = 0;
const slideContainer = document.getElementById('carouselSlide');
const totalSlides = 3;

function moveSlide(direction) {
    currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
    slideContainer.style.transform = `translateX(-${currentSlide * (100 / totalSlides)}%)`;
}

setInterval(() => moveSlide(1), 3500);

// Cart State Management (LocalStorage)
let cart = JSON.parse(localStorage.getItem('fk_cart')) || [];
updateCartBadge();

function addToCart(productId) {
    cart.push(productId);
    localStorage.setItem('fk_cart', JSON.stringify(cart));
    updateCartBadge();
    alert('Product added to Cart!');
}

function updateCartBadge() {
    document.getElementById('cartCount').innerText = cart.length;
}