import { registerOntology } from '../../src/register-ontologies';
import ontology from './ontology.json';

registerOntology('cidoc-crm', ontology as any); 