import { useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { BitmapLayer, LineLayer, IconLayer } from '@deck.gl/layers';
import { MapView } from '@deck.gl/core';
import { TileLayer } from '@deck.gl/geo-layers';
import { makeStyles } from '@material-ui/core/styles';
import { Button } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { DataGrid } from '@material-ui/data-grid';
import xml2js from 'xml2js';
import moment from 'moment';

import { loadLocalFile, segmentsToLineData } from './utils';

const INITIAL_VIEW_STATE = {
  longitude: 138.0,
  latitude: 37.0,
  zoom: 5,
  minZoom: 4,
  maxZoom: 16
};

const segmentsDataGridColumns = [
  { field: 'id', headerName: 'No.', valueFormatter: ({ value }) => (value + 1), width: 60, sortable: false, },
  { field: 'start', headerName: 'start', valueFormatter: ({ value }) => moment(value).format(), width: 220, },
  { field: 'end', headerName: 'end', valueFormatter: ({ value }) => moment(value).format(), width: 220, },
  { field: 'count', headerName: 'count', type: 'number', width: 80, sortable: false, },
];

const pointsDataGridColumns = [
  { field: 'id', headerName: 'No.', valueFormatter: ({ value }) => (value + 1), width: 60, sortable: false, },
  { field: 'time', headerName: 'time', valueFormatter: ({ value }) => moment(value).format(), width: 220, },
  { field: 'lat', headerName: 'lat [deg]', type: 'number', width: 100, sortable: false, },
  { field: 'lon', headerName: 'lon [deg]', type: 'number', width: 100, sortable: false, },
  { field: 'ele', headerName: 'ele [m]', type: 'number', width: 80, sortable: false, },
];

const ICON_MAPPING = {
  marker: { x: 0, y: 0, width: 48, height: 48, anchorX: 24, anchorY: 48, mask: true }
};

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100vw',
    height: '100vh'
  },
  listGrid: {
  },
  mapGrid: {
    position: 'relative',
  },
  segmentsGrid: {
    padding: 10,
    height: '40%',
  },
  pointsGrid: {
    padding: 10,
    height: '50%',
  },
  controllerGrid: {
    padding: 10,
    height: '5%'
  },
  button: {
    margin: 5,
    backgroundColor: 'lightgray',
  }
}));

function App() {
  const [gpx, setGpx] = useState(null);
  const [segments, setSegments] = useState([]);
  const [points, setPoints] = useState([]);
  const [currentSegment, setCurrentSegment] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [lineData, setLineData] = useState(null);
  const [iconData, setIconData] = useState(null);
  const classes = useStyles();

  useEffect(() => {
    (async () => {
      if (gpx) {
        setSegments(gpx.track.segments);
        setPoints([]);
        setLineData(segmentsToLineData(gpx.track.segments));

      } else {
        setSegments([]);
        setPoints([]);
        setLineData(null);
        setIconData(null);
      }
    })();
  }, [gpx]);

  useEffect(() => {
    (async () => {
      setCurrentSegment(null);
    })();
  }, [segments]);

  useEffect(() => {
    (async () => {
      if (gpx && ((currentSegment === 0) || (0 < currentSegment))) {
        const segments = gpx.track.segments;
        const segment = segments[currentSegment];
        setPoints(segment.points.map((x, i) => ({ id: i, ...x })));
        setLineData(segmentsToLineData(gpx.track.segments));  // 選択しているセグメントをハイライト表示するため、データを再生成して LineLayer をレンダリングさせる。

      } else {
        setPoints([]);
        setLineData(null);
        setIconData(null);
      }
    })();
  }, [currentSegment]);

  useEffect(() => {
    (async () => {
      if (gpx && (currentSegment === 0 || 0 < currentSegment) && (currentPoint === 0 || 0 < currentPoint)) {
        const segments = gpx.track.segments;
        const segment = segments[currentSegment];
        const point = segment.points[currentPoint];
        setIconData([{ coordinates: [point.lon, point.lat] }]);

      } else {
        setIconData(null);
      }
    })();
  }, [currentPoint]);


  const handleOpen = (async (e) => {
    const target = e.target;

    const tracks = await Promise.all(Object.keys(target.files).map(key => {
      const file = target.files[key];
      return loadLocalFile(file)
        .then(text => {
          return xml2js.parseStringPromise(text, { mergeAttrs: true })
        })
        .then(json => {

          // 扱いやすいよう整形する。
          const segments = [];
          for (const trk of json.gpx.trk) {
            segments.push(...trk.trkseg.map((y, i) => ({
              start: new Date(y.trkpt[0].time),
              end: new Date(y.trkpt[y.trkpt.length - 1].time),
              count: y.trkpt.length,
              points: y.trkpt.map(x => ({
                lat: Number(x.lat[0]),
                lon: Number(x.lon[0]),
                ele: Number(x.ele[0]),
                time: new Date(x.time[0])
              }))
            })));
          }

          return { segments: segments.map((x, i) => ({ id: i, ...x })) }; // リスト表示するためユニークな番号を付けて返す。
        })
    }))
      .catch((error) => {
        console.error(error)
      })

    // 扱いやすいよう整形して結合する。
    const gpx = { track: { segments: [] } };
    for (const track of tracks) {
      gpx.track.segments.push(...track.segments);
    }

    setGpx(gpx);

    e.target.value = null;
  });

  const handleClear = (async (e) => {
    setGpx(null);
  });

  return (
    <Grid container className={classes.root} spacing={2}>
      <Grid container item xs={5} className={classes.listGrid} >
        <Grid item xs={12} className={classes.segmentsGrid} >
          segments
          <DataGrid
            rows={segments}
            columns={segmentsDataGridColumns}
            disableColumnMenu={true}
            headerHeight={30}
            rowHeight={30}
            hideFooterSelectedRowCount={true}
            onRowClick={(param, e) => { setCurrentSegment(param.row.id); }}
          />
        </Grid>
        <Grid item xs={12} className={classes.pointsGrid} >
          points
          <DataGrid
            rows={points}
            columns={pointsDataGridColumns}
            disableColumnMenu={true}
            headerHeight={30}
            rowHeight={30}
            hideFooterSelectedRowCount={true}
            rowsPerPageOptions={[100, 500, 1000]}
            onRowClick={(param, e) => { setCurrentPoint(param.row.id); }} />
        </Grid>
        <Grid item xs={12} className={classes.controllerGrid} >
          <input multiple accept="application/gpx+xml" id="open-gpx-file" type='file' hidden onChange={handleOpen} />
          <label htmlFor="open-gpx-file">
            <Button component="span" className={classes.button} >
              open
          </Button>
          </label>
          <Button component="span" className={classes.button} disabled={gpx ? false : true} onClick={handleClear} >
            clear
          </Button>
          <Button component="span" className={classes.button} disabled={true}  >
            upload
          </Button>
        </Grid>
      </Grid>

      <Grid item xs={7} className={classes.mapGrid} >
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller={true}
          getCursor={({ isHovering }) => isHovering ? 'pointer' : 'grab'}
        >
          <TileLayer id='raster'
            data={'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'}
            minZoom={5}
            maxZoom={18}
            tileSize={256}
            opacity={1.0}

            renderSubLayers={props => {
              const {
                bbox: { west, south, east, north }
              } = props.tile;

              return new BitmapLayer(props, {
                data: null,
                image: props.data,
                bounds: [west, south, east, north]
              });
            }} />

          <LineLayer
            id={'line-layer'}
            data={lineData}
            pickable={true}
            widthUnits={'pixels'}
            widthScale={4}
            getWidth={2}
            getSourcePosition={d => d.from}
            getTargetPosition={d => d.to}
            getWidth={1}
            getColor={d => (d.segmentId === currentSegment) ? [255, 0, 0] : [255, 127, 127]}
          />

          <IconLayer
            id={'icon-layer'}
            data={iconData}
            iconAtlas={'baseline_place_black_48dp.png'}
            iconMapping={ICON_MAPPING}
            getIcon={d => 'marker'}
            getPosition={d => d.coordinates}
            sizeUnits={'pixels'}
            sizeMinPixels={48}
            getColor={d => [255, 0, 0]}
          />

          <MapView id="map" controller={true} repeat >
          </MapView>
        </DeckGL>
      </Grid>
    </Grid>
  );
}

export default App;
