// This file handles all interactions with the Gemini API
import { GEMINI_CONFIG } from "../config"

/**
 * Sends an image to the Gemini API and gets a description
 * @param {string} imageBase64 - The base64-encoded image data (with or without the data:image/... prefix)
 * @returns {Promise<string>} - A promise that resolves to the image description
 */
export async function getImageDescription(imageBase64) {
  try {
    // Remove the data:image/jpeg;base64, part if it exists
    const base64Data = imageBase64.includes("base64,") ? imageBase64.split("base64,")[1] : imageBase64

    // Prepare the request to the Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_CONFIG.API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Describe this image in detail. Focus on the main elements, colors, and overall scene. Be descriptive but concise.",
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generation_config: GEMINI_CONFIG.GENERATION_CONFIG,
      }),
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data = await response.json()

    // Extract the description from the response
    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0]
    ) {
      return data.candidates[0].content.parts[0].text
    } else {
      throw new Error("Unexpected API response format")
    }
  } catch (error) {
    console.error("Error getting image description:", error)
    return "Failed to generate description. Please try again."
  }
}

/**
 * Sends an image to Gemini and gets a list of objects and their colors.
 * @param {string} imageBase64 - The base64-encoded image data.
 * @returns {Promise<string>} - A promise that resolves to the color/object description.
 */
export async function getImageColorsDescription(imageBase64) {
  try {
    const base64Data = imageBase64.includes("base64,") ? imageBase64.split("base64,")[1] : imageBase64;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_CONFIG.API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "List the main objects in this image and specify the color of each object. Only mention the object and its color, e.g., 'blue shirt, yellow car'. Do not describe the scene or background.",
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generation_config: GEMINI_CONFIG.GENERATION_CONFIG,
        }),
      }
    );

    if (!response.ok) throw new Error(`API request failed with status ${response.status}`);

    const data = await response.json();
    console.log( data);
    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0]
    ) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Unexpected API response format");
    }
  } catch (error) {
    console.error("Error getting image color description:", error);
    return "Failed to generate color description. Please try again.";
  }
}

/**
 * Sends an image to Gemini and gets objects, their colors, and coordinates.
 * @param {string} imageBase64 - The base64-encoded image data.
 * @returns {Promise<Array>} - A promise that resolves to an array of objects with color and coordinates.
 */
export async function getImageColorsAndCoordinates(imageBase64) {
  try {
    const base64Data = imageBase64.includes("base64,") ? imageBase64.split("base64,")[1] : imageBase64;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_CONFIG.API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Detect all main objects in this image. For complex objects like a human wearing a shirt, try to separate the shirt object from the person, the person and their color is shown and then the shirt and the color is among the object. Try to intelligently choose the objects that would be most beneficial to a colorlblind individual. For each object, return a JSON array with: object name, color (as a name and hex code), and the bounding box coordinates as {x, y, width, height} relative to the image. Example: [{\"object\":\"car\",\"color\":\"blue\",\"hex\":\"#0000FF\",\"box\":{\"x\":100,\"y\":50,\"width\":120,\"height\":60}}]. Only return the JSON array, nothing else.",
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generation_config: GEMINI_CONFIG.GENERATION_CONFIG,
        }),
      }
    );

    if (!response.ok) throw new Error(`API request failed with status ${response.status}`);

    const data = await response.json();

    console.log("Gemini response:", data);
    // Try to extract JSON from the response text
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    // Find the first JSON array in the text
    const match = text.match(/\[.*\]/s);
    if (match) {
      return JSON.parse(match[0]);
    } else {
      throw new Error("No JSON array found in Gemini response");
    }
  } catch (error) {
    console.error("Error getting image color/coordinates:", error);
    return [];
  }
}
