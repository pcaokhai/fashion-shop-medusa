"use server";
import { revalidatePath } from "next/cache";
import { data } from ".";

const done = async <T>(p: Promise<T>) => {
  const cart = await p;
  revalidatePath("/", "layout");
  return cart;
};

export const addToCart = (variantId: string, quantity = 1) => done(data.addToCart(variantId, quantity));
export const updateLine = (lineId: string, quantity: number) => done(data.updateLine(lineId, quantity));
export const removeLine = (lineId: string) => done(data.removeLine(lineId));
