"""HTTP contract using temporary inventory only; never imports the running app."""
import ast
from datetime import date, datetime
import json
from pathlib import Path
import tempfile
import threading
from typing import Any, Dict, List, Optional
import unittest

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from pydantic import BaseModel, StrictBool


class VisibilityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'cars.json'
        self.original = {'cars': {
            'visible': {'id': 'visible', 'available': True, 'class': 'sedan', 'pricing': {'deposit': 5000}, 'owner': 'fixture'},
            'hidden': {'id': 'hidden', 'available': False, 'class': 'suv'},
            'legacy': {'id': 'legacy', 'class': 'sedan'},
            'null': {'id': 'null', 'available': None, 'class': 'sedan'},
        }}
        self.path.write_text(json.dumps(self.original))
        self.app = FastAPI()
        ns = dict(app=self.app, API_PREFIX='/api', ADMIN_KEY='fixture', BaseModel=BaseModel,
                  StrictBool=StrictBool, Depends=Depends, Query=Query, HTTPException=HTTPException,
                  JSONResponse=JSONResponse, Optional=Optional, List=List, Dict=Dict, Any=Any,
                  date=date, datetime=datetime, _lock=threading.Lock(), CARS_JSON=self.path,
                  BOOKINGS_JSON=Path(self.temp.name) / 'bookings.json',
                  is_available=lambda *args: True,
                  load_json=lambda path: json.loads(path.read_text()) if path.exists() else {},
                  save_json=lambda path, data: path.write_text(json.dumps(data)))
        names = {'CarVisibilityUpdate', 'admin_required', 'admin_update_car_visibility',
                 'get_cars', 'admin_get_cars', 'get_available_cars', '_parse_date', 'as_cars_list'}
        tree = ast.parse((Path(__file__).resolve().parents[1] / 'web_integration.py').read_text())
        nodes = [node for node in tree.body if isinstance(node, (ast.ClassDef, ast.FunctionDef)) and node.name in names]
        self.assertEqual(len(nodes), len(names))
        exec(compile(ast.Module(body=nodes, type_ignores=[]), 'isolated_visibility.py', 'exec'), ns)
        self.client = TestClient(self.app)

    def patch(self, car_id, available):
        return self.client.patch(f'/api/admin/cars/{car_id}/visibility?key=fixture', json={'available': available})

    def test_hide_persists_and_public_endpoints_exclude_while_admin_keeps_car(self):
        response = self.patch('visible', False)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIs(response.json()['available'], False)
        saved = json.loads(self.path.read_text())['cars']['visible']
        self.assertEqual(saved['pricing'], {'deposit': 5000})
        self.assertEqual(saved['owner'], 'fixture')
        self.assertTrue(saved['updated_at'])
        public = self.client.get('/api/cars').json()
        self.assertEqual({car['id'] for car in public['cars']}, {'legacy', 'null'})
        self.assertEqual(public['count'], 2)
        dated = self.client.get('/api/available-cars?start_date=2026-11-04&end_date=2026-11-11').json()
        self.assertEqual(set(dated['available_cars']), {'legacy', 'null'})
        self.assertIn('visible', self.client.get('/api/admin/cars').json()['cars'])

    def test_reenable_restores_public_car_and_category_filter(self):
        self.assertEqual(self.patch('hidden', True).status_code, 200)
        public = self.client.get('/api/cars?category=SUV').json()
        self.assertEqual([car['id'] for car in public['cars']], ['hidden'])
        self.assertEqual(public['count'], 1)
        self.assertIn('no-store', self.client.get('/api/cars').headers['cache-control'])

    def test_auth_missing_and_invalid_flags_never_write(self):
        before = self.path.read_text()
        self.assertEqual(self.client.patch('/api/admin/cars/visible/visibility', json={'available': False}).status_code, 422)
        self.assertEqual(self.client.patch('/api/admin/cars/visible/visibility?key=wrong', json={'available': False}).status_code, 403)
        for value in ['false', 0, 1, None]:
            self.assertEqual(self.patch('visible', value).status_code, 422)
        self.assertEqual(self.patch('missing', False).status_code, 404)
        self.assertEqual(self.path.read_text(), before)

    def test_patch_preserves_edits_saved_after_card_loaded(self):
        data = json.loads(self.path.read_text())
        data['cars']['visible']['pricing']['deposit'] = 9000
        self.path.write_text(json.dumps(data))
        self.assertEqual(self.patch('visible', False).status_code, 200)
        self.assertEqual(json.loads(self.path.read_text())['cars']['visible']['pricing']['deposit'], 9000)


if __name__ == '__main__':
    unittest.main()
