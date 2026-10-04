"use server";
import { revalidatePath } from "next/cache";
import { data } from ".";

async function done<T>(p: Promise<T>): Promise<T> {
  const result = await p;
  revalidatePath("/", "layout");
  return result;
}

export async function addToCart(variantId: string, quantity = 1) {
  await done(data.addToCart(variantId, quantity));
}
export async function updateLine(lineId: string, quantity: number) {
  await done(data.updateLine(lineId, quantity));
}
export async function removeLine(lineId: string) {
  await done(data.removeLine(lineId));
}
