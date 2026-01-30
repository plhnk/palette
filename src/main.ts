type Rgb = { r: number; g: number; b: number }

function getSolidFill(node: SceneNode): SolidPaint | null {
  if (!('fills' in node)) {
    return null
  }
  const fills = node.fills
  if (!Array.isArray(fills)) {
    return null
  }
  for (const paint of fills) {
    if (paint.type === 'SOLID' && paint.visible !== false) {
      return paint
    }
  }
  return null
}

function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (value: number) =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6
    } else if (max === g) {
      h = (b - r) / delta + 2
    } else {
      h = (r - g) / delta + 4
    }
    h *= 60
    if (h < 0) {
      h += 360
    }
  }
  const l = (max + min) / 2
  const s =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  return { h, s: s * 100, l: l * 100 }
}

function rgbToHsb({ r, g, b }: Rgb): { h: number; s: number; b: number } {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6
    } else if (max === g) {
      h = (b - r) / delta + 2
    } else {
      h = (r - g) / delta + 4
    }
    h *= 60
    if (h < 0) {
      h += 360
    }
  }
  const s = max === 0 ? 0 : delta / max
  return { h, s: s * 100, b: max * 100 }
}

function getLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export default async function () {
  const selection = figma.currentPage.selection
  if (selection.length === 0) {
    figma.closePlugin('Select at least one layer with a solid fill.')
    return
  }

  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' })

  const createdFrames: FrameNode[] = []
  let skipped = 0

  for (const node of selection) {
    if (node.locked) {
      skipped += 1
      continue
    }

    const solid = getSolidFill(node)
    if (solid === null) {
      skipped += 1
      continue
    }

    const parent = node.parent
    if (parent === null || !('insertChild' in parent)) {
      skipped += 1
      continue
    }

    const frame = figma.createFrame()
    frame.name = node.name
    frame.layoutMode = 'VERTICAL'
    frame.primaryAxisSizingMode = 'FIXED'
    frame.counterAxisSizingMode = 'FIXED'
    frame.itemSpacing = 8
    frame.paddingTop = 12
    frame.paddingRight = 12
    frame.paddingBottom = 12
    frame.paddingLeft = 12
    frame.fills = [
      {
        type: 'SOLID',
        color: solid.color,
        opacity: solid.opacity ?? 1
      }
    ]
    frame.resize(node.width, node.height)
    frame.x = node.x
    frame.y = node.y

    const rgb = solid.color
    const hsl = rgbToHsl(rgb)
    const hsb = rgbToHsb(rgb)
    const hex = rgbToHex(rgb)
    const rgba = {
      r: Math.round(rgb.r * 255),
      g: Math.round(rgb.g * 255),
      b: Math.round(rgb.b * 255),
      a: solid.opacity ?? 1
    }

    const textColor =
      getLuminance(rgb) > 0.6
        ? { r: 0, g: 0, b: 0 }
        : { r: 1, g: 1, b: 1 }
    const nameText = figma.createText()
    nameText.fontName = { family: 'Inter', style: 'Bold' }
    nameText.fontSize = 24
    nameText.lineHeight = { unit: 'PIXELS', value: 30 }
    nameText.textAutoResize = 'HEIGHT'
    nameText.fills = [
      {
        type: 'SOLID',
        color: textColor,
        opacity: 1
      }
    ]
    nameText.characters = node.name
    nameText.resize(frame.width - 24, nameText.height)
    nameText.layoutAlign = 'STRETCH'

    const pairsContainer = figma.createFrame()
    pairsContainer.layoutMode = 'VERTICAL'
    pairsContainer.primaryAxisSizingMode = 'AUTO'
    pairsContainer.counterAxisSizingMode = 'AUTO'
    pairsContainer.itemSpacing = 8
    pairsContainer.fills = []
    pairsContainer.layoutAlign = 'STRETCH'

    const createPair = (label: string, value: string) => {
      const pairFrame = figma.createFrame()
      pairFrame.layoutMode = 'HORIZONTAL'
      pairFrame.primaryAxisSizingMode = 'AUTO'
      pairFrame.counterAxisSizingMode = 'AUTO'
      pairFrame.itemSpacing = 4
      pairFrame.fills = []
      pairFrame.layoutAlign = 'STRETCH'

      const labelText = figma.createText()
      labelText.fontName = { family: 'Inter', style: 'Bold' }
      labelText.fontSize = 16
      labelText.lineHeight = { unit: 'PIXELS', value: 20 }
      labelText.textAutoResize = 'WIDTH_AND_HEIGHT'
      labelText.characters = label
      labelText.fills = [
        {
          type: 'SOLID',
          color: textColor,
          opacity: 0.5
        }
      ]

      const valueText = figma.createText()
      valueText.fontName = { family: 'Inter', style: 'Bold' }
      valueText.fontSize = 16
      valueText.lineHeight = { unit: 'PIXELS', value: 20 }
      valueText.textAutoResize = 'WIDTH_AND_HEIGHT'
      valueText.characters = value
      valueText.fills = [
        {
          type: 'SOLID',
          color: textColor,
          opacity: 1
        }
      ]

      pairFrame.appendChild(labelText)
      pairFrame.appendChild(valueText)
      return pairFrame
    }

    const hslText = `${hsl.h.toFixed(0)}°, ${hsl.s.toFixed(
      1
    )}%, ${hsl.l.toFixed(1)}%`
    const hsbText = `${hsb.h.toFixed(0)}°, ${hsb.s.toFixed(
      1
    )}%, ${hsb.b.toFixed(1)}%`
    const rgbaText = `rgba(${rgba.r}, ${rgba.g}, ${
      rgba.b
    }, ${rgba.a.toFixed(2)})`

    pairsContainer.appendChild(createPair('HSL:', hslText))
    pairsContainer.appendChild(createPair('HSB:', hsbText))
    pairsContainer.appendChild(createPair('HEX:', hex))
    pairsContainer.appendChild(createPair('RGBA:', rgbaText))

    frame.appendChild(nameText)
    frame.appendChild(pairsContainer)

    const index = parent.children.indexOf(node)
    parent.insertChild(index, frame)
    node.remove()

    createdFrames.push(frame)
  }

  if (createdFrames.length > 0) {
    figma.currentPage.selection = createdFrames
    figma.viewport.scrollAndZoomIntoView(createdFrames)
  }

  if (createdFrames.length === 0) {
    figma.closePlugin('No selected layers had a solid fill.')
  } else if (skipped > 0) {
    figma.closePlugin(
      `Created ${createdFrames.length} palette frame${
        createdFrames.length === 1 ? '' : 's'
      }. Skipped ${skipped} layer${skipped === 1 ? '' : 's'}.`
    )
  } else {
    figma.closePlugin(
      `Created ${createdFrames.length} palette frame${
        createdFrames.length === 1 ? '' : 's'
      }.`
    )
  }
}
