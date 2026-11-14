# E-Commerce REST API

A modular REST API for an e-commerce platform, built with Node.js, Express, and MongoDB. The project covers account authentication, product variants, categories, brands, carts, coupons, orders, reviews, image uploads, and customer delivery addresses.

> This project is under active development and is not yet production-ready. See [Current limitations](#current-limitations) before deploying it.

## Features

- Separate customer and seller registration routes, email confirmation, login, and password recovery
- JWT-based authentication and role checks for seller management and customer orders
- Category, subcategory, and brand management
- Products with multiple variants, options, stock, discounts, and images
- Public product catalog with search, filtering, sorting, pagination, and optional result counts
- Public brand listing and related-brand lookup by subcategory
- Cloudinary image storage
- Shopping cart management
- Percentage and fixed-value coupons
- Order creation from a cart or a supplied product list
- Idempotent checkout2 orders, Stripe Checkout in EGP, signed webhooks, and payment reconciliation
- Verified-purchase product reviews and aggregate ratings
- User-owned delivery addresses with default-address handling
- Request validation with Joi
- Automated tests using Node.js's built-in test runner

## Tech stack

- **Runtime:** Node.js with ES modules
- **Framework:** Express 5
- **Database:** MongoDB with Mongoose
- **Authentication:** JSON Web Tokens and bcryptjs
- **Validation:** Joi
- **File uploads:** Multer and Cloudinary
- **Email:** Nodemailer with Gmail
- **Payments:** Stripe Checkout
- **Testing:** `node:test` and `node:assert`

## Project structure

```text
.
|-- config/                 # Local environment variables (not committed)
|-- DB/
|   |-- Models/             # Mongoose models
|   `-- connection.js       # MongoDB connection
|-- Src/
|   |-- Middelware/         # Authentication and shared validation
|   |-- Modules/            # Feature routes, controllers, and validation
|   |   |-- Address/
|   |   |-- Auth/
|   |   |-- Brand/
|   |   |-- Cart/
|   |   |-- Category/
|   |   |-- Coupon/
|   |   |-- Order/
|   |   |-- Product/
|   |   |-- Review/
|   |   |-- SubCategory/
|   |   `-- User/
|   |-- Utills/             # JWT, hashing, email, uploads, and errors
|   `-- index.route.js      # Main route registration
|-- tests/                  # Node.js tests
|-- .env.example
|-- index.js                # Application entry point
`-- package.json
```

## Getting started

### Prerequisites

- Node.js 24.x (also used on Vercel)
- MongoDB Atlas or a local replica set; checkout2 requires transaction support (a standalone MongoDB instance is insufficient)
- A Cloudinary account for image uploads
- A Gmail account with an app password for email delivery

From this backend folder, run `npm install`, create `config/.env` from `.env.example`, fill in the values below, and run `npm start`. The API defaults to `http://localhost:3000`. The example file does not include every optional/payment variable listed below.

`npm run dev` uses nodemon, which is not currently declared in package.json; it requires nodemon to be installed separately.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DB_ATLAS` | MongoDB connection string; use a hosted database on Vercel |
| `SALT_ROUND` | bcrypt hashing rounds |
| `TOKEN_SIGNATURE` | Secret used to sign and verify JWTs |
| `expireTime` | JWT lifetime passed to `jsonwebtoken`, in seconds |
| `refreshExpireTime` | Resend-confirmation token lifetime in seconds; falls back to `expireTime` when unset |
| `BEARER_KEY` | Authorization prefix, usually `Bearer ` including the space |
| `MOOD` | Application environment label |
| `App` | Cloudinary folder name used by category and subcategory uploads |
| `APP` | Cloudinary folder name used by product uploads |
| `gmail` | Gmail sender address |
| `gmailPass` | Gmail app password |
| `cloud_name` | Cloudinary cloud name |
| `api_key` | Cloudinary API key |
| `api_secret` | Cloudinary API secret |
| `PORT` | Local HTTP port; defaults to `3000` |
| `STRIPE_SECRET_KEY` | Stripe API secret for card checkout and webhook handling |
| `STRIPE_SUCCESS_URL` | Frontend success URL; checkout2 appends `orderId` |
| `STRIPE_CANCEL_URL` | Frontend cancellation URL; checkout2 appends `orderId` |
| `endpointSecret` | Stripe webhook signing secret; required for signature verification and event parsing in the current handler |


Never commit `config/.env`. It is already excluded by `.gitignore`.

## Authentication

Protected endpoints expect the JWT returned by `POST /auth/login`:

```http
Authorization: Bearer <token>
```

The exact prefix is configured through `BEARER_KEY`.

### Example registration

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "01000000000",
    "password": "Example123!",
    "cPassword": "Example123!"
  }'
```

For seller registration, send the same body to `POST /auth/seller/signup`. The routes assign `User` and `Seller` respectively; do not supply a role in the request body.

Registration creates an account, then emails a confirmation link that must be followed before login.

### Example login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "Example123!"
  }'
```

## API reference

Protected routes require the `Authorization` header. `User` means a customer account; seller management routes allow `Seller` and `Admin`. Ownership checks still apply. File-upload routes use `multipart/form-data`; other request bodies use JSON.

### Authentication

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | Public | Register a customer (`User`) |
| `POST` | `/auth/seller/signup` | Public | Register a seller (`Seller`) |
| `POST` | `/auth/login` | Public | Log in a confirmed user and return a JWT |
| `GET` | `/auth/emailConfirmation/:token` | Public | Confirm an email address |
| `GET` | `/auth/newconfirmationemail/:token` | Public | Send another confirmation email |
| `PATCH` | `/auth/passcode` | Public | Send a password-reset OTP |
| `PATCH` | `/auth/resetcode` | Public | Reset a password using an OTP |
| `PATCH` | `/auth/forgetlink` | Public | Send a password-reset link |
| `PATCH` | `/auth/resetlink/:token` | Public | Reset a password using a token |

### Categories and subcategories

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/category` | Public | List categories with their subcategories |
| `POST` | `/category` | Seller | Create a category with an `image` file |
| `PATCH` | `/category/:categoryId` | Seller | Update a category and optionally replace its image |
| `GET` | `/category/:categoryId/subcategory` | Public | List subcategories in a category |
| `POST` | `/category/:categoryId/subcategory` | Seller | Create a subcategory with an `image` file |
| `PATCH` | `/category/:categoryId/subcategory/:subCategoryId` | Seller | Update a subcategory |

### Brands

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/brand` | Public | List brand names, images, and slugs alphabetically |
| `POST` | `/brand` | Seller | Create a brand with an `image` file |
| `PATCH` | `/brand/:brandId` | Seller | Update a brand and optionally replace its image |

### Products and variants

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/product/mine` | Seller | List own products, including unavailable variants |
| `GET` | `/product` | Public | Browse, search, and filter available product variants |
| `POST` | `/product` | Seller | Create a product and its first variant |
| `PUT` | `/product/:productId` | Seller | Update product-level information |
| `POST` | `/product/:productId/variant` | Seller | Add a variant to a product |
| `GET` | `/product/:productId/variant/:variantId` | Public | Get one product variant |
| `PATCH` | `/product/:productId/variant/:variantId` | Seller | Update a variant |
| `DELETE` | `/product/:productId/variant/:variantId` | Seller | Delete a variant |
| `GET` | `/product/:subCategoryId/brand` | Public | Get distinct brand names associated with a subcategory |

Product creation uses `multipart/form-data` with the following fields:

- Required text fields: `name`, `description`, `price`, `categoryId`, `subCategoryId`, and `brandId`
- Required file field: `mainImage` (one file)
- Optional file field: `subImages` (up to four files)
- Optional fields: `stock`, `discount`, `options`, and `specifications`
- `options` and `specifications` must be JSON-encoded strings when sent as form fields

Names belong to variants: responses contain `variants[].name` and no product-level `name`. The flat `name` form field on `POST /product` names the first variant. `POST /product/:productId/variant` requires its own `name` and `price`; upload images or select individual images from variants of the same product using `mainImagePublicId` and a JSON-encoded `subImagesPublicIds` array. An uploaded main image and `mainImagePublicId` cannot be supplied together. Reused gallery images can be combined with uploads, with at most four additional images in total. Rename a variant with `PATCH /product/:productId/variant/:variantId` and `{"name":"Shirt Medium"}`. `PUT /product/:productId` no longer accepts `name`. The product slug stays unchanged when variants are renamed. Order line items snapshot the selected variant's name; historical orders retain their original snapshots.

For variant updates, omitting image fields retains existing images; new gallery uploads append to retained images. Supplying `subImagesPublicIds` explicitly selects which existing gallery images to retain; use `"[]"` to clear them. The same-product image checks also apply to updates.

Older data with missing variant names needs a separately reviewed migration; there is no automatic startup migration or migration script included in this checkout.

#### Product catalog queries

```bash
curl "http://localhost:3000/product?search=shirt&minPrice=100&maxPrice=500&sort=finalPrice&page=1&size=12&count=true"
```

| Parameter | Behavior |
| --- | --- |
| `search` | Case-insensitive literal search in variant name and product description |
| `brandId`, `categoryId`, `subCategoryId` | Filter by ObjectId; repeat `subCategoryId` to match any of several subcategories |
| `minPrice`, `maxPrice` | Inclusive bounds on variant `finalPrice` |
| `discount`, `rating` | Exact matches for variant discount (0–100) and average product rating (0–5) |
| `sort` | Comma-separated `name`, `createdAt`, `ratings.average`, `discount`, or `finalPrice`; prefix with `-` for descending |
| `page`, `size` | Defaults: page `1`, size `3`; maximum size `100` |
| `count` | With `true` and a search or filter, adds `pagination` containing `page`, `size`, `totalItems`, and `hasMore` |
| `fields` | Select returned fields, e.g. `variants`, `variants.name`, `description`; outer `name` is no longer accepted |

The catalog excludes deleted products and unavailable variants (inactive or out of stock). Browsing or searching without filters returns the highest-discount available matching variant per product, choosing the first on ties. Adding any supported filter returns one product entry per matching variant, with a one-element `variants` array. Search matches each returned variant name or its shared product description. `sort=name` sorts by the returned variant name. Pagination and counts apply to those entries. Without a search or filter, `count=true` still returns only `{ products }`.

### Cart

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/cart` | User | Read the current customer's cart |
| `POST` | `/cart` | User | Add a quantity to an existing item, or create it |
| `PATCH` | `/cart` | User | Set an item's absolute quantity |
| `DELETE` | `/cart/:productId/:variantId` | User | Remove an item |

Example body:

```json
{
  "productId": "507f1f77bcf86cd799439011",
  "variantId": "507f1f77bcf86cd799439012",
  "quantity": 2
}
```

### Coupons

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/coupon` | Seller | List own coupons |
| `POST` | `/coupon` | Seller | Create a coupon |
| `PUT` | `/coupon/:couponId` | Seller | Update a coupon |
| `DELETE` | `/coupon/:couponId` | Seller | Delete a coupon owned by the current user |

Example coupon body:

```json
{
  "code": "WELCOME10",
  "discountType": "percentage",
  "discountValue": 10,
  "maxDiscountAmount": 100,
  "minOrderAmount": 500,
  "expireDate": "2027-12-31T23:59:59.000Z",
  "usageLimit": 100,
  "applicableProducts": [],
  "applicableCategories": [],
  "excludedProducts": []
}
```

Checkout enforces one coupon redemption/reservation per customer through `usedBy`; a configurable per-user usage limit is not currently implemented.

For a fixed discount, set `discountType` to `fixed` and omit `maxDiscountAmount`.

### Accounts, wishlists, and addresses

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET / PATCH | `/user/me` | User / Seller / Admin | Read profile; update name and phone |
| GET / POST / DELETE | `/user/wishlist` | User | Read, add, or remove customer-owned wishlist items |
| GET / POST | `/address` | User | List or create customer-owned addresses |
| GET / PATCH / DELETE | `/address/:addressId` | User | Read, update, or remove an owned address |

Wishlist mutations use `productId` and `variantId`. Wishlists are saved against the authenticated customer, not against the browser. Profile email is read-only in the storefront.

Addresses must be in Egypt. Address phone validation accepts Egyptian mobile numbers and normalizes supported international prefixes to local format (for example, `+201000000000` to `01000000000`). Registration and profile validation also use the shared Egyptian phone normalizer; phone may be omitted at registration. GeoJSON coordinates use `[longitude, latitude]`. The first address becomes the default; selecting another default unsets the previous one.

### Orders and checkout2

Only checkout2 routes are active for creating/paying orders. The older `POST /order` and `/order/checkout` routes are commented out.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/order/checkout2` | User | Create or recover an order using an idempotency key |
| POST | `/order/checkout2/:orderId/payment` | User | Create or recover the owned order's Stripe session |
| POST | `/order/checkout2/:orderId/reconcile` | User | Synchronize payment status or request unpaid cancellation |
| POST | `/order/webhook` | Stripe signature | Receive checkout2 events as a raw JSON body |
| GET | `/order/mine` | User | Paginated customer orders and related reviews |
| GET | `/order/manage` | Seller / Admin | Paginated orders available for fulfillment |
| PATCH | `/order/:orderId` | Seller / Admin | Set `onTheWay` or `delivered` |

Create an order with an `Idempotency-Key` header containing 8 to 128 letters, digits, underscores, or hyphens:

```http
POST /order/checkout2
Authorization: Bearer <token>
Idempotency-Key: checkout-unique-001
Content-Type: application/json

{"addressId":"507f1f77bcf86cd799439013","phone":["01000000000"],"paymentMethod":"Card"}
```

- `paymentMethod` is required: `Cash` or `Card`. Optional fields include `code`, `note`, and explicit `products` entries with `productId`, `variantId`, and `quantity`. Omit products to use the current customer's cart.
- Keep the same key and body when retrying after an uncertain response. The same customer/key recovers the original immutable order, even if another body is sent. A new purchase needs a new key.
- MongoDB transactions reserve stock and coupon usage together with order creation. Cash orders are placed immediately; card orders remain `pendingPayment` until payment is verified.
- For a card order, POST `{}` to its `/payment` endpoint and redirect to the returned Stripe session URL. New sessions charge **EGP**, matching storefront prices. Existing attempts retain their saved Stripe parameters and currency.
- Signed payment events or reconciliation finalize the order and update its cart. Confirmed unpaid cancellation/expiration restores stock and releases coupon usage. Duplicate notifications do not repeat these effects.
- POST `{}` to `/reconcile` to synchronize status. POST `{"cancel":true}` to request cancellation of an unpaid order. Paid orders cannot be refunded through this endpoint. Returning to the cancellation URL alone does not cancel an order.
- Network failures can leave payment uncertain. Recover the existing attempt rather than blindly creating a second purchase. Attempts with unknown Stripe session creation outcomes stop automatic recreation after 22 hours and need operator reconciliation.

#### Stripe configuration

Set these variables on the **backend**, using your actual frontend domain for production:

```dotenv
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_SUCCESS_URL=http://localhost:3001/checkout/return?result=success
STRIPE_CANCEL_URL=http://localhost:3001/checkout/return?result=cancel
endpointSecret=your-stripe-webhook-signing-secret
```

The signing variable is case-sensitive: `endpointSecret`. Register the backend's HTTPS `/order/webhook` endpoint in Stripe for `checkout.session.completed`, `checkout.session.expired`, and `checkout.session.async_payment_succeeded`. Local testing requires forwarding Stripe events to the local backend. Keep the raw-body middleware for this route; it verifies Stripe's signature instead of requiring a customer JWT.

Both return URLs receive an appended `orderId`. The frontend reconciles with the backend; a success query parameter is not proof of payment. Callback changes affect new attempts; existing attempts keep their saved URLs. Never expose Stripe secrets in frontend environment variables.

Checkout reserves stock before card payment. Unstarted reservations and missed events need operational cleanup/reconciliation; exporting a cleanup helper does not schedule it. No background worker is configured by this README.

#### Fulfillment

A seller can manage orders containing exclusively that seller's products. Mixed-seller orders require an admin until per-seller fulfillment is implemented. Completed checkout is required before fulfillment. Allowed transitions are `placed -> onTheWay`, `placed -> delivered`, and `onTheWay -> delivered`; repeat requests for an already applied target status succeed. Pending, cancelled, and backward transitions are rejected. Updates use an atomic status check, and do not change payment, stock, or coupon usage.

### Reviews

Customer review creation uses `POST /product/:productId/review` with:

```json
{
  "orderId": "507f1f77bcf86cd799439014",
  "rating": 5,
  "comment": "Excellent product"
}
```

The order must belong to the customer, include the product, and be delivered. Rating is an integer from 1 to 5 and the trimmed comment is 1 to 2000 characters. Creation checks for an existing review by that customer/product and recalculates the product's average rating. `PUT /review/:reviewId` is also registered for updating a review, with `orderId`, `rating`, and `comment`; the current storefront exposes review creation.


## Deployment

Deploy the backend and frontend as separate projects. The backend requires Node.js 24.x and the environment variables above, plus a reachable transaction-capable MongoDB database. Keep the frontend's backend URL pointed at this deployed HTTPS API. The current backend enables `cors()` globally; frontend authenticated requests use Next.js server route handlers.

Never commit `config/.env` or provider secrets. `.vercelignore` excludes local configuration, tests, output, and scripts from deployment. Configure deployed secrets in the host's environment settings. Configure the Stripe webhook against the backend domain and Stripe return URLs against the frontend domain.

## Current limitations

This project remains under active development. Before production use, review rate limiting, security headers, logging, error handling, dependency advisories, payment cleanup/reconciliation scheduling, and integration coverage. Full mixed-seller fulfillment and a customer refund flow are not implemented. Run `npm audit` against the current dependency tree; older audit counts in documentation are not a security guarantee.
