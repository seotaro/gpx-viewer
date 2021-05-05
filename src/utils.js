export function loadLocalFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            resolve(reader.result);
        }

        reader.readAsText(file);
    });
}

export function segmentsToLineData(segments) {
    let data = [];

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const points = segment.points;
        for (let j = 1; j < points.length; j++) {
            const from = points[j - 1];
            const to = points[j];

            data.push({
                segmentId: segment.id,
                from: [from.lon, from.lat],
                to: [to.lon, to.lat],
                ele: to.ele,
                time: to.time,
            });
        }
    }

    return data;
}
