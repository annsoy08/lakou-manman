import { getUserShopCart, updateUserShopCart } from "./firestore";

const SHOP_CART_STORAGE_KEY = "lakou-manman-shop-cart";
const SHOP_CART_UPDATED_EVENT = "lakou-manman-shop-cart-updated";
const GUEST_SHOP_CART_STORAGE_KEY = SHOP_CART_STORAGE_KEY;

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeCartItem(item = {}) {
  return {
    id: String(item.id || "").trim(),
    title: String(item.title || item.name || "").trim(),
    price: normalizeNumber(item.price),
    imageUrl: String(item.imageUrl || item.images?.[0]?.url || "").trim(),
    condition: String(item.condition || "").trim(),
    sellerName: String(item.sellerName || item.authorName || "").trim(),
    shopName: String(item.shopName || "").trim(),
    status: String(item.status || "available").trim().toLowerCase(),
    addedAt: item.addedAt || new Date().toISOString(),
  };
}

function getScopedShopCartStorageKey(userId = "") {
  const normalizedUserId = String(userId || "").trim();
  return normalizedUserId ? `${SHOP_CART_STORAGE_KEY}::${normalizedUserId}` : GUEST_SHOP_CART_STORAGE_KEY;
}

function sortCartItemsByAddedAtDesc(cartItems = []) {
  return [...cartItems].sort((a, b) => String(b?.addedAt || "").localeCompare(String(a?.addedAt || "")));
}

function mergeShopCartItems(...cartGroups) {
  const seenItemIds = new Set();
  const mergedItems = [];

  cartGroups.flat().forEach((item) => {
    const normalizedItem = normalizeCartItem(item);
    if (!normalizedItem.id || seenItemIds.has(normalizedItem.id)) {
      return;
    }

    seenItemIds.add(normalizedItem.id);
    mergedItems.push(normalizedItem);
  });

  return sortCartItemsByAddedAtDesc(mergedItems);
}

function emitCartUpdated(cartItems, userId = "") {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SHOP_CART_UPDATED_EVENT, {
      detail: {
        items: Array.isArray(cartItems) ? cartItems : [],
        count: Array.isArray(cartItems) ? cartItems.length : 0,
        userId: String(userId || "").trim(),
      },
    })
  );
}

function readCartFromStorage(userId = "") {
  if (!canUseBrowserStorage()) {
    return [];
  }

  try {
    const rawCart = window.localStorage.getItem(getScopedShopCartStorageKey(userId));
    const parsedCart = JSON.parse(rawCart || "[]");
    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return sortCartItemsByAddedAtDesc(
      parsedCart
        .map((item) => normalizeCartItem(item))
        .filter((item) => item.id)
    );
  } catch (error) {
    console.error("Error reading shop cart:", error);
    return [];
  }
}

function writeCartToStorage(cartItems, userId = "") {
  if (!canUseBrowserStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(getScopedShopCartStorageKey(userId), JSON.stringify(cartItems));
    return true;
  } catch (error) {
    console.error("Error writing shop cart:", error);
    return false;
  }
}

function removeCartFromStorage(userId = "") {
  if (!canUseBrowserStorage()) {
    return false;
  }

  try {
    window.localStorage.removeItem(getScopedShopCartStorageKey(userId));
    return true;
  } catch (error) {
    console.error("Error clearing shop cart:", error);
    return false;
  }
}

async function persistUserShopCart(userId, cartItems) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return true;
  }

  try {
    await updateUserShopCart(normalizedUserId, cartItems);
    return true;
  } catch (error) {
    console.error("Error syncing shop cart to account:", error);
    return false;
  }
}

export function getShopCartItems(userId = "") {
  return readCartFromStorage(userId);
}

export function getShopCartCount(userId = "") {
  return getShopCartItems(userId).length;
}

export function isItemInShopCart(itemId, userId = "") {
  const normalizedItemId = String(itemId || "").trim();
  if (!normalizedItemId) {
    return false;
  }

  return getShopCartItems(userId).some((item) => item.id === normalizedItemId);
}

export async function syncShopCartWithAccount(userId = "") {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    const guestCartItems = getShopCartItems();
    emitCartUpdated(guestCartItems);
    return guestCartItems;
  }

  const guestCartItems = getShopCartItems();
  const accountLocalCartItems = getShopCartItems(normalizedUserId);

  try {
    const remoteCartItems = await getUserShopCart(normalizedUserId);
    const mergedCartItems = mergeShopCartItems(accountLocalCartItems, guestCartItems, remoteCartItems);
    writeCartToStorage(mergedCartItems, normalizedUserId);
    if (guestCartItems.length > 0) {
      removeCartFromStorage();
    }
    await persistUserShopCart(normalizedUserId, mergedCartItems);
    emitCartUpdated(mergedCartItems, normalizedUserId);
    return mergedCartItems;
  } catch (error) {
    console.error("Error hydrating account shop cart:", error);
    const fallbackCartItems = mergeShopCartItems(accountLocalCartItems, guestCartItems);
    if (fallbackCartItems.length > 0) {
      writeCartToStorage(fallbackCartItems, normalizedUserId);
    }
    emitCartUpdated(fallbackCartItems, normalizedUserId);
    return fallbackCartItems;
  }
}

export async function addItemToShopCart(item, options = {}) {
  const normalizedUserId = String(options?.userId || "").trim();
  const normalizedItem = normalizeCartItem(item);
  if (!normalizedItem.id) {
    return { items: getShopCartItems(normalizedUserId), alreadyExists: false, added: false, synced: !normalizedUserId };
  }

  const currentCart = getShopCartItems(normalizedUserId);
  const alreadyExists = currentCart.some((cartItem) => cartItem.id === normalizedItem.id);
  if (alreadyExists) {
    return { items: currentCart, alreadyExists: true, added: false, synced: !normalizedUserId };
  }

  const nextCart = mergeShopCartItems([normalizedItem], currentCart);
  writeCartToStorage(nextCart, normalizedUserId);
  const synced = await persistUserShopCart(normalizedUserId, nextCart);
  emitCartUpdated(nextCart, normalizedUserId);
  return { items: nextCart, alreadyExists: false, added: true, synced };
}

export async function removeItemFromShopCart(itemId, options = {}) {
  const normalizedUserId = String(options?.userId || "").trim();
  const normalizedItemId = String(itemId || "").trim();
  const nextCart = getShopCartItems(normalizedUserId).filter((item) => item.id !== normalizedItemId);
  writeCartToStorage(nextCart, normalizedUserId);
  const synced = await persistUserShopCart(normalizedUserId, nextCart);
  emitCartUpdated(nextCart, normalizedUserId);
  return { items: nextCart, synced };
}

export async function clearShopCart(options = {}) {
  const normalizedUserId = String(options?.userId || "").trim();
  removeCartFromStorage(normalizedUserId);
  const synced = await persistUserShopCart(normalizedUserId, []);
  emitCartUpdated([], normalizedUserId);
  return { items: [], synced };
}

export function subscribeToShopCartUpdates(callback, userId = "") {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event) => {
    callback?.(event?.detail?.items || getShopCartItems(userId));
  };

  window.addEventListener(SHOP_CART_UPDATED_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(SHOP_CART_UPDATED_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export { SHOP_CART_STORAGE_KEY, SHOP_CART_UPDATED_EVENT };
