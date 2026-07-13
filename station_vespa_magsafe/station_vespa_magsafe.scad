// =====================================================================
//  STATION DE RECHARGE MAGSAFE — STYLE VESPA VINTAGE
//  ---------------------------------------------------------------
//  Station de charge pour iPhone (MagSafe) + vide-poches,
//  inspiree des courbes d'un scooter italien retro.
//  Concue pour impression FDM mono-couleur sur Bambu Lab A1
//  (plateau 256 x 256 mm), PLA / PLA Matte, sans supports.
//
//  2 pieces imprimees seulement :
//    1. le corps monobloc (base + vide-poches + dossier incline 68°,
//       rebord, phare, texte, canal de cable interne, patins, lest)
//    2. le cache arriere (ferme le MagSafe, plaque le chargeur,
//       maintient le cable dans sa rainure)
//  + une piece de test rapide des tolerances (logement MagSafe seul)
//  + en option : plaque de lest, badge logo generique.
//
//  Toutes les cotes sont en millimetres.
// =====================================================================

// ---------------------------------------------------------------------
//  PIECE A AFFICHER / EXPORTER
// ---------------------------------------------------------------------
part = "assembly";
// Valeurs possibles :
// assembly       -> toutes les pieces assemblees
// corps          -> le corps monobloc (orientation d'impression : debout)
// cache          -> le cache arriere seul (face visible sur le plateau)
// test           -> piece de test rapide du logement MagSafe
// logo           -> badge logo generique separe
// cable_section  -> vue en coupe du passage du cable
// plaque         -> plaque de fermeture de la cavite de lest

// ---------------------------------------------------------------------
//  OPTIONS PRINCIPALES
// ---------------------------------------------------------------------
show_logo = false;              // badge logo rapporte (false = version sans logo)
show_decorative_text = true;    // texte decoratif en relief sur le dossier
show_hearts = true;             // coeurs decoratifs (facade, sommet, vide-poches)
decorative_text = "Je t'aime";  // texte libre ("VESPA", "LA DOLCE VITA", ...)
decorative_text_size = 8;       // hauteur des lettres (reduire pour un texte long)
// Police du texte. Pour retrouver le lettrage cursif du logo d'origine
// (usage personnel) : installer une fonte "style Vespa" (TTF) sur votre
// machine puis indiquer son nom ici, ex. text_font = "Vespa";
text_font = "Liberation Sans:style=Bold Italic";

magsafe_diameter  = 56.2;       // diametre du chargeur MagSafe Apple
magsafe_thickness = 5.7;        // epaisseur du chargeur
cable_diameter    = 4.2;        // diametre du cable USB-C du chargeur
phone_angle       = 68;         // inclinaison du plan telephone (degres / horizontale)

cable_exit = "rear";            // sortie du cable : "rear" (arriere) ou "bottom" (dessous)
weight_cavity = true;           // cavite de lest sous la base (rondelles metalliques)

// false (defaut) : station VRAIMENT monobloc, sans cache arriere ;
//   le chargeur est retenu par quatre clips et le cable se clipse dans
//   une rainure a levres (profil omega). Aucune vis.
// true : variante avec cache arriere visse (4 x M3), pilotes inclus.
use_rear_cover = false;

// Hauteur du centre MagSafe au-dessus du sol (spec : 105 a 115 mm).
// Le telephone est tenu par les aimants ; reduire vers ~92 mm si l'on
// souhaite qu'un iPhone Pro Max repose exactement sur le rebord.
magsafe_center_height = 105;

// ---------------------------------------------------------------------
//  TOLERANCES D'IMPRESSION
// ---------------------------------------------------------------------
fit_clearance   = 0.25;   // jeu par cote pour les emboitements
cover_clearance = 0.25;   // jeu du cache arriere
magsafe_clear   = 0.25;   // jeu radial autour du chargeur
screw_pilot_d   = 2.8;    // trou pilote vis M3 autotaraudeuse
screw_pass_d    = 3.4;    // trou de passage vis M3
screw_head_d    = 6.4;    // logement tete cylindrique M3

// ---------------------------------------------------------------------
//  DIMENSIONS GENERALES
// ---------------------------------------------------------------------
base_w   = 150;   // largeur de la base
base_d   = 125;   // profondeur de la base
base_h   = 18;    // hauteur de la base
corner_r = 14;    // rayon des angles de la base
edge_r   = 3;     // rayon d'arrondi des aretes superieures

phone_cx = -36;   // axe X du support telephone (zone gauche)

// Rebord telephone
lip_w = 72;       // largeur utile du rebord
lip_t = 5;        // epaisseur du muret avant
lip_h = 8;        // hauteur du muret au-dessus de la base
lip_y = 16;       // position Y du muret (avant du rebord)
shelf_d = 13;     // profondeur du rebord (muret inclus)
lip_notch_w = 14; // encoche cable Lightning / USB-C
lip_notch_d = 8;  // profondeur de l'encoche

// Vide-poches (zone droite)
tray_x1 = 7;   tray_x2 = 67;    // emprise interieure en X (largeur 60)
tray_y1 = 38;  tray_y2 = 116;   // emprise interieure en Y (profondeur 78)
tray_depth = 11;                // profondeur utile
tray_r = 8;                     // rayon des coins interieurs

// Dossier incline (fusionne avec la base : monobloc)
dos_w_bot = 76;    // largeur en bas
dos_w_top = 72;    // largeur en haut (= diametre de l'arc sommital)
dos_t     = 7;     // epaisseur structurelle courante
dos_top_z = 180;   // hauteur totale de la station
dos_face_y = 46;   // position Y de la face avant du dossier au niveau z = base_h

// Renforts de la jonction dossier / base (epaisseur locale >= 8 mm,
// aucune cassure nette)
fillet_front_r = 10;  // conge avant (8 a 12)
fillet_back_r  = 8;   // conge arriere (8 a 12)
rib_t = 2.5;          // epaisseur des deux nervures laterales discretes
edge_round = 2.5;     // rayon d'arrondi du pourtour du dossier (effet galet)

// Phare / logement MagSafe (le phare decoratif est centre sur le MagSafe :
// bossage circulaire raye facon optique de phare, le chargeur affleure au
// centre comme la lentille — le decor ne gene jamais la charge).
boss_d   = 64;     // diametre exterieur du phare (bossage avant)
boss_h   = 5;      // saillie du bossage (degage la bosse camera de l'iPhone)
open_d   = 50;     // ouverture frontale (inferieure au diametre du chargeur)
front_lip = 1.2;   // matiere devant le chargeur (0.8 a 1.2 max)

// Canal de cable
chan_w = 5.2;      // largeur de la rainure (cable 4.2, jamais pince)
chan_d = 5;        // profondeur de la rainure
duct_w = 13;       // largeur du conduit interne bas (laisse passer la
duct_d = 7;        // fiche USB-C) et sur-profondeur cote arriere

// Cache arriere
cover_w = 66;      // largeur du cache
cover_y1 = 13;     // debut (bas, au ras du conge arriere)
cover_y2 = 140;    // fin (haut)
cover_t = 2.8;     // epaisseur
cover_r = 12;      // rayon des coins

// Cavite de lest (env. 150 a 250 g de rondelles metalliques)
wc_x = 48;                 // demi-largeur de la cavite
wc_y1 = 5;  wc_y2 = 35;    // emprise Y
wc_depth = 13;             // profondeur totale
wc_rab = 3;                // debord de la feuillure de la plaque
plate_t = 2.8;             // epaisseur de la plaque de lest

// ---------------------------------------------------------------------
//  VALEURS DERIVEES (ne pas modifier)
// ---------------------------------------------------------------------
sA = sin(phone_angle);  cA = cos(phone_angle);
dos_len   = (dos_top_z - base_h)/sA;              // longueur du dossier le long de la pente
dos_Yt    = dos_face_y + dos_t/sA;                // origine Y du dossier place
ms_ly     = (magsafe_center_height - base_h)/sA;  // centre MagSafe (coord. locale dossier)
pocket_d  = magsafe_diameter + 2*magsafe_clear;   // diametre du logement chargeur
pocket_depth = dos_t + boss_h - front_lip;        // profondeur du logement depuis l'arriere
arc_r    = dos_w_top/2;                           // rayon de l'arc sommital
arc_cy   = dos_len - arc_r;                       // centre de l'arc sommital
cover_screws = [[-14,58],[14,58],[-14,129],[14,129]];     // vis du cache (coord. locales)
tray_cx = (tray_x1+tray_x2)/2;  tray_cy = (tray_y1+tray_y2)/2;

fn_vis  = 64;   // finesse des cercles visibles
fn_hide = 32;   // finesse des elements caches
eps = 0.01;

// ---------------------------------------------------------------------
//  OUTILS GENERIQUES
// ---------------------------------------------------------------------

// Prisme rectangulaire a coins arrondis (2D extrude)
module rrect(x1, y1, x2, y2, r, h, fn=fn_hide) {
    linear_extrude(height=h)
        offset(r=r, $fn=fn) offset(delta=-r)
            polygon([[x1,y1],[x2,y1],[x2,y2],[x1,y2]]);
}

// Coeur 2D (pointe vers -Y) ; a = cote du carre generateur
// (largeur totale ~1,71 a, hauteur totale ~1,56 a)
module heart2d(a) {
    union() {
        rotate(45) square(a, center=true);
        for (s = [-1, 1])
            translate([s*a*0.3536, a*0.3536]) circle(d=a, $fn=fn_vis);
    }
}

// Pilier d'angle de la base : cylindre + tore sommital (arete arrondie)
// + petit chanfrein en pied (anti "patte d'elephant")
module base_pillar() {
    union() {
        cylinder(h=0.8, r1=corner_r-0.8, r2=corner_r, $fn=fn_vis);
        translate([0,0,0.8]) cylinder(h=base_h-edge_r-0.8, r=corner_r, $fn=fn_vis);
        translate([0,0,base_h-edge_r]) {
            rotate_extrude($fn=fn_vis)
                translate([corner_r-edge_r,0]) circle(r=edge_r, $fn=24);
            cylinder(h=edge_r, r=corner_r-edge_r, $fn=fn_vis);
        }
    }
}

// Transformation locale dossier -> position assemblee
// (le dossier est modelise a plat, dos sur le plateau : X largeur,
//  Y longueur le long de la pente, Z epaisseur, dos a Z=0)
module place_dossier() {
    translate([phone_cx, dos_Yt, base_h])
        rotate([phone_angle,0,0])
            children();
}

// =====================================================================
//  1. BASE
// =====================================================================

// Corps de la base : plus large a l'avant qu'a l'arriere, flancs
// legerement galbes (silhouette de tablier de scooter), aretes
// superieures arrondies.
module rounded_base() {
    hull() {
        translate([-61, 14, 0])   base_pillar();   // avant gauche (le + large)
        translate([ 61, 14, 0])   base_pillar();   // avant droit
        translate([-60.5, 58, 0]) base_pillar();   // galbe lateral gauche
        translate([ 60.5, 58, 0]) base_pillar();   // galbe lateral droit
        translate([-57, 111, 0])  base_pillar();   // arriere gauche
        translate([ 57, 111, 0])  base_pillar();   // arriere droit
    }
}

// Muret avant du rebord telephone (arrondi partout)
module phone_lip() {
    hull() {
        for (x = [phone_cx-lip_w/2+2.5, phone_cx+lip_w/2-2.5]) {
            translate([x, lip_y+lip_t/2, base_h-2])
                cylinder(h=2, r=lip_t/2, $fn=fn_hide);
            translate([x, lip_y+lip_t/2, base_h+lip_h-lip_t/2])
                sphere(r=lip_t/2, $fn=fn_hide);
        }
    }
}

// Encoche du rebord pour un cable branche directement au telephone
module lip_notch_cut() {
    translate([0,0,base_h-1])
    linear_extrude(height=lip_h+3)
        offset(r=3, $fn=fn_hide) offset(delta=-3)
            polygon([[phone_cx-lip_notch_w/2, lip_y-2],
                     [phone_cx+lip_notch_w/2, lip_y-2],
                     [phone_cx+lip_notch_w/2, lip_y+lip_notch_d],
                     [phone_cx-lip_notch_w/2, lip_y+lip_notch_d]]);
}

// Vide-poches : poche a coins arrondis, fond en cuvette tres douce,
// rainures concentriques, chanfrein d'entree et echancrure de prise.
module tray() {
    floor_z = base_h - tray_depth;                    // fond a z = 7
    union() {
        // poche principale
        translate([0,0,floor_z])
            rrect(tray_x1, tray_y1, tray_x2, tray_y2, tray_r, base_h-floor_z+2, fn_vis);
        // pente douce du fond vers le centre (cuvette conique de 0,8 mm)
        translate([tray_cx, tray_cy, floor_z-0.8+eps])
            cylinder(h=0.8, r1=eps, r2=44, $fn=fn_hide);
        // rainures concentriques decoratives / anti-glisse (0,7 mm)
        for (r = show_hearts ? [18, 24] : [6, 12, 18, 24])
            translate([tray_cx, tray_cy, floor_z-1.4])
                difference() {
                    cylinder(h=2.2, r=r+0.4, $fn=fn_vis);
                    translate([0,0,-eps]) cylinder(h=2.4, r=r-0.4, $fn=fn_vis);
                }
        // grand coeur grave au centre du fond du vide-poches
        if (show_hearts)
            translate([tray_cx, tray_cy-1, floor_z-1.4])
                linear_extrude(height=2.1)
                    difference() {
                        heart2d(16);
                        offset(delta=-1.1) heart2d(16);
                    }
        // chanfrein adouci du bord superieur
        hull() {
            translate([0,0,base_h-1.4])
                rrect(tray_x1, tray_y1, tray_x2, tray_y2, tray_r, eps, fn_vis);
            translate([0,0,base_h])
                rrect(tray_x1-1.6, tray_y1-1.6, tray_x2+1.6, tray_y2+1.6, tray_r+1.6, 2, fn_vis);
        }
        // echancrure laterale pour saisir les objets (calotte spherique)
        translate([tray_x2+7, tray_cy, base_h+9]) sphere(r=16, $fn=fn_vis);
    }
}

// Conduit interne du cable dans le bas de la station : la rainure du
// dossier plonge sous le conge arriere par une bouche elargie (13 mm :
// la fiche USB-C passe sans etre demontee), traverse la base en pente
// douce a 68 degres (aucun coude a 90), rejoint la rainure du dessous
// (7 x 4) et ressort a l'arriere par une ouverture arrondie.
module cable_channel_base_cut() {
    union() {
        // bouche + conduit incline (dans le repere du dossier), elargi
        // en largeur et en profondeur pour laisser passer la fiche
        // USB-C ; la bouche se fusele en douceur vers la rainure du dos
        // (plafonds en pente : imprimable debout sans supports)
        place_dossier()
            hull() {
                translate([-duct_w/2, -30, -duct_d]) cube([duct_w, 32, duct_d+chan_d]);
                translate([-chan_w/2, cover_y1-5, 0]) cube([chan_w, 5, chan_d]);
            }
        // cove interne adoucissant le virage conduit -> rainure du
        // dessous (rayon 8, entierement cache sous le conge arriere)
        translate([phone_cx-duct_w/2, 57, 10.5]) rotate([0,90,0])
            cylinder(h=duct_w, r=8, $fn=fn_hide);
        // rainure sous la base (7 x 4) rejoignant le bord arriere
        translate([phone_cx-3.5, 40, -1]) cube([7, base_d-40+2, 5]);
        // sortie arriere : ouverture 9 x 6 a sommet arrondi anti-coupure
        if (cable_exit == "rear")
            hull() {
                translate([phone_cx-4.5, 108, -1]) cube([9, base_d-108+2, 1]);
                translate([phone_cx, 108, 1.5]) rotate([-90,0,0])
                    cylinder(h=base_d-108+2, r=4.5, $fn=fn_hide);
            }
    }
}

// Logements des quatre patins silicone (D10 x 1,5)
module rubber_feet() {
    for (p = [[-62,12],[62,12],[-62,113],[62,113]])
        translate([p[0], p[1], -eps]) cylinder(h=1.5+eps, d=10, $fn=fn_vis);
}

// Cavite de lest sous la base : feuillure pour la plaque + cavite a
// rondelles. Le plafond est voute a 45 degres dans la profondeur : le
// pont restant fait ~14 mm, imprimable sans supports.
module weight_compartment() {
    union() {
        // feuillure de la plaque (jeu 0,25 par cote via la plaque)
        rrect(-wc_x-wc_rab, wc_y1-2, wc_x+wc_rab, wc_y2+2, 4, plate_t+0.15, fn_hide);
        // cavite pour rondelles, plafond en chanfreins 45
        hull() {
            rrect(-wc_x, wc_y1, wc_x, wc_y2, 3, wc_depth-8, fn_hide);
            translate([0,0,wc_depth-0.2])
                rrect(-wc_x, wc_y1+8, wc_x, wc_y2-8, 3, 0.2, fn_hide);
        }
    }
}

// Bossages de vis de la plaque de lest, accroches aux parois laterales
// de la cavite (dessous en pente : imprimables tete en bas, sans support)
module weight_plate_bosses() {
    for (s = [-1, 1])
        hull() {
            translate([s*(wc_x-2), 20, 6.5])       cylinder(h=wc_depth-6.5+0.5, d=9, $fn=fn_hide);
            translate([s*(wc_x+1.5), 20, plate_t]) cylinder(h=wc_depth-plate_t+0.5, d=9, $fn=fn_hide);
        }
}

// Trous pilotes des deux vis de plaque de lest (M3 x 12)
module weight_plate_screw_cut() {
    for (s = [-1, 1])
        translate([s*(wc_x-2), 20, -1]) cylinder(h=wc_depth+2, d=2.6, $fn=fn_hide);
}

// ------------------- SOCLE (partie basse du monobloc) -------------------
// Le conduit de cable est decoupe plus tard, au niveau du corps entier,
// car il traverse a la fois la base et le pied du dossier.
module base_body() {
    difference() {
        union() {
            difference() {
                union() { rounded_base(); phone_lip(); }
                tray();
                if (weight_cavity) weight_compartment();
            }
            if (weight_cavity) weight_plate_bosses();
        }
        lip_notch_cut();
        rubber_feet();
        if (weight_cavity) weight_plate_screw_cut();
    }
}

// Plaque de fermeture de la cavite de lest
module weight_plate() {
    difference() {
        rrect(-wc_x-wc_rab+cover_clearance, wc_y1-2+cover_clearance,
              wc_x+wc_rab-cover_clearance, wc_y2+2-cover_clearance, 4, plate_t, fn_vis);
        for (s = [-1, 1]) {
            translate([s*(wc_x-2),20,-eps]) cylinder(h=plate_t+2*eps, d=screw_pass_d, $fn=fn_hide);
            translate([s*(wc_x-2),20,-eps]) cylinder(h=2, d=screw_head_d, $fn=fn_hide); // tete affleurante
        }
        // encoche de prise au bord
        translate([0, wc_y2+2, plate_t]) rotate([90,0,0]) cylinder(h=8, r=3, $fn=fn_hide, center=true);
    }
}

// =====================================================================
//  2. DOSSIER INCLINE (modelise a plat, dos sur le plateau :
//     X = largeur, Y = longueur le long de la pente, Z = epaisseur,
//     dos a Z = 0, face avant a Z = dos_t)
// =====================================================================

// Silhouette 2D du dossier : un grand coeur allonge. Deux lobes au
// sommet avec un creux central, flancs galbes qui s'affinent vers la
// base (la pointe du coeur plonge dans le socle). Union de trois
// enveloppes convexes : petale gauche, petale droit, dorsale centrale.
module dossier_outline() {
    lobe_r = 21;                       // rayon des lobes du coeur
    lobe_y = dos_len - lobe_r;         // sommet des lobes = haut du dossier
    union() {
        for (s = [-1,1])
            hull() {
                translate([s*(dos_w_bot/2-10), 6])  circle(r=10, $fn=fn_vis); // bas
                translate([s*(dos_w_bot/2-9), 70])  circle(r=10, $fn=fn_vis); // galbe
                translate([s*18, lobe_y]) circle(r=lobe_r, $fn=fn_vis);       // lobe
            }
        // dorsale : remplit le centre sous le creux du coeur
        hull() {
            for (s = [-1,1]) translate([s*(dos_w_bot/2-10), 6]) circle(r=10, $fn=fn_vis);
            translate([0, dos_len-45]) circle(r=18, $fn=fn_vis);
        }
    }
}

// Phare decoratif : bossage circulaire centre sur le MagSafe, dome
// lisse et epure, souligne par un unique cerclage fin. Le chargeur
// affleure au centre comme la lentille ; la saillie de 5 mm degage
// aussi la bosse camera de l'iPhone.
module decorative_headlight() {
    translate([0, ms_ly, 0])
        difference() {
            // bossage a sommet bien arrondi
            hull() {
                cylinder(h=dos_t+boss_h-2, d=boss_d, $fn=fn_vis);
                cylinder(h=dos_t+boss_h-0.8, d=boss_d-3, $fn=fn_vis);
                cylinder(h=dos_t+boss_h, d=boss_d-6, $fn=fn_vis);
            }
            // cerclage : fine gorge circulaire sur la face (0,6)
            translate([0,0,dos_t+boss_h-0.6])
                difference() {
                    cylinder(h=1, r=29.3, $fn=fn_vis);
                    translate([0,0,-eps]) cylinder(h=1.2, r=28.5, $fn=fn_vis);
                }
        }
}

// Logement du chargeur MagSafe, insere par l'arriere.
// L'ouverture frontale (open_d) est inferieure au diametre du chargeur :
// il ne peut pas traverser ; il reste front_lip mm de matiere devant.
module magsafe_pocket() {
    union() {
        translate([0, ms_ly, -eps]) {
            cylinder(h=pocket_depth+eps, d=pocket_d, $fn=fn_vis);
            cylinder(h=1, d1=pocket_d+2, d2=pocket_d, $fn=fn_vis);  // chanfrein d'insertion
            cylinder(h=dos_t+boss_h+1, d=open_d, $fn=fn_vis);       // ouverture frontale
        }
    }
}

// Clips (bossettes flexibles) retenant le chargeur : trois avec le
// cache visse, quatre (plus saillants) en version monobloc sans cache.
// Places hors du canal de cable ; le chargeur se retire toujours en le
// repoussant par l'ouverture frontale.
module magsafe_clips() {
    angles = use_rear_cover ? [90, 210, 330] : [45, 135, 225, 315];
    inset  = use_rear_cover ? 1.0 : 0.9;   // saillie 0,6 / 0,7 mm
    for (a = angles)
        translate([0, ms_ly, 0]) rotate([0,0,a])
            translate([pocket_d/2+inset, 0, pocket_depth-magsafe_thickness-0.6])
                sphere(r=1.6, $fn=fn_hide);
}

// Levres de la rainure de cable (version sans cache) : l'ouverture est
// retrecie a 3,6 mm sur les bords, le cable (4,2) s'y clipse et ne peut
// plus s'echapper. Nervures verticales : imprimables debout sans support.
module cable_lips() {
    for (s = [-1, 1])
        translate([s*chan_w/2 - (s>0 ? 0.8 : 0), 14, 0])
            cube([0.8, ms_ly - pocket_d/2 - 3 - 14, 0.8]);
}

// Decor du dos en version monobloc : anneaux graves autour du logement
// (clin d'oeil a la roue de secours), a la place du cache.
module rear_rings_cut() {
    for (r = [pocket_d/2+2.5, pocket_d/2+5])
        translate([0, ms_ly, -eps])
            difference() {
                cylinder(h=0.6+eps, r=r+0.5, $fn=fn_vis);
                translate([0,0,-eps]) cylinder(h=1, r=r-0.5, $fn=fn_vis);
            }
}

// Canal de cable du dossier : rainure droite dans le dos, du logement
// MagSafe jusque sous la jonction avec la base (fermee par le cache
// arriere, puis prolongee par le conduit interne de la base).
module cable_channel() {
    translate([-chan_w/2, -30, -eps]) cube([chan_w, ms_ly+30, chan_d]);
}

// Carenage sous le phare (facon tablier de klaxon Vespa) : supprime le
// surplomb sous le bossage quand le corps est imprime debout, et adoucit
// le raccord du phare avec la face avant.
module headlight_fairing() {
    hull() {
        translate([0, ms_ly, 0])    cylinder(h=dos_t+boss_h-1.5, d=boss_d-2, $fn=fn_vis);
        translate([0, ms_ly-54, 0]) cylinder(h=dos_t+0.5, d=24, $fn=fn_vis);
    }
}

// Colonnettes pleines autour des pilotes de vis du cache : garantissent
// de la matiere saine meme si les parametres sont modifies.
module screw_bosses() {
    for (p = cover_screws)
        translate([p[0], p[1], 0]) cylinder(h=dos_t, d=8, $fn=fn_hide);
}

// Pilotes de vis du cache arriere (M3 x 6 autotaraudeuse, prof. 5,6)
module cover_pilot_cuts() {
    for (p = cover_screws)
        translate([p[0], p[1], -eps]) cylinder(h=5.6, d=screw_pilot_d, $fn=fn_hide);
}

// Coeur decoratif de la facade, en relief sous le carenage du phare
// (le sommet du dossier est lui-meme un coeur : pas d'autre motif en haut)
module front_hearts() {
    translate([0, 18, dos_t-0.2])
        linear_extrude(height=1.4) heart2d(11);
}

// Texte decoratif en relief (0,8 mm), centre entre le phare et le
// creux du coeur. Le texte est recoupe a l'interieur de la silhouette
// (marge 2 mm) : un texte trop long ne debordera jamais du dossier.
module decorative_text_module() {
    intersection() {
        translate([0, 140, dos_t-0.2])
            linear_extrude(height=1.0)
                text(decorative_text, size=decorative_text_size, font=text_font,
                     halign="center", valign="center", spacing=1.1, $fn=fn_hide);
        translate([0,0,dos_t-0.3]) linear_extrude(height=1.2)
            offset(delta=-2) dossier_outline();
    }
}

// ------------------- DOSSIER COMPLET (coordonnees locales) ---------
// Le pied du dossier plonge dans la masse de la base (extension sous
// y = 0) : la fusion est monobloc, sans aucun assemblage.
module back_panel() {
    union() {
        difference() {
            union() {
                // plaque du coeur aux aretes entierement arrondies
                // (effet galet : minkowski avec une sphere)
                minkowski() {
                    translate([0,0,edge_round])
                        linear_extrude(height=dos_t-2*edge_round)
                            offset(r=-edge_round) dossier_outline();
                    sphere(r=edge_round, $fn=20);
                }
                // extension noyee dans la base (recoupee au ras du sol)
                translate([-34, -24, 0]) cube([68, 32, dos_t]);
                screw_bosses();
                decorative_headlight();
                headlight_fairing();
                if (show_decorative_text) decorative_text_module();
                if (show_hearts) front_hearts();
            }
            magsafe_pocket();
            cable_channel();
            if (use_rear_cover) cover_pilot_cuts();
            else rear_rings_cut();
            if (show_logo)  // logement du badge logo rapporte
                translate([0, 42, dos_t-1.0]) cylinder(h=boss_h+2, d=24.5, $fn=fn_vis);
        }
        magsafe_clips();
        if (!use_rear_cover) cable_lips();
    }
}

// =====================================================================
//  RENFORTS DE JONCTION DOSSIER / BASE (monobloc)
// =====================================================================

// Extrusion le long de X d'un profil 2D exprime dans le plan (Y,Z)
module yz_extrude(w) {
    rotate([90,0,90]) linear_extrude(height=w) children();
}

// Profil 2D d'un conge tangent entre le dessus de la base (z = base_h)
// et une face du dossier ; ang = angle interieur entre les deux plans,
// dirY = +1 si le sol s'etend vers l'arriere, -1 vers l'avant.
module fillet_profile(y_corner, r, ang, dirY) {
    ha = ang/2;
    d  = r/tan(ha);                       // distance coin -> points de tangence
    bx = dirY + cA;  by = sA;             // bissectrice (non normalisee)
    bn = sqrt(bx*bx + by*by);
    difference() {
        polygon([[y_corner + dirY*d, base_h],
                 [y_corner, base_h],
                 [y_corner + d*cA, base_h + d*sA]]);
        translate([y_corner + (r/sin(ha))*bx/bn, base_h + (r/sin(ha))*by/bn])
            circle(r=r, $fn=fn_vis);
    }
}

// Conges internes avant (r 10) et arriere (r 8) : aucune cassure nette,
// epaisseur locale du pied du dossier portee a plus de 8 mm.
module junction_fillets() {
    translate([phone_cx-36, 0, 0]) yz_extrude(72)
        fillet_profile(dos_face_y, fillet_front_r, 180-phone_angle, -1);
    translate([phone_cx-35, 0, 0]) yz_extrude(70)
        fillet_profile(dos_Yt, fillet_back_r, phone_angle, 1);
}

// Deux nervures laterales discretes le long du dos du dossier, juste a
// l'exterieur du cache arriere (jeu >= 1 mm avec celui-ci) ; elles
// s'enracinent dans le dessus de la base et dans le flanc du dossier.
module side_ribs() {
    for (s = [-1, 1])
        translate([phone_cx + s*(cover_w/2 + 1 + rib_t/2), 0, 0])
            hull() {
                translate([-rib_t/2, 58, base_h-2]) cube([rib_t, 10, 4]);
                translate([-rib_t/2, 61, 44])       cube([rib_t, 5, 5]);
            }
}

// =====================================================================
//  CORPS MONOBLOC : base + dossier + conges + nervures, moins le
//  conduit de cable ; deja oriente pour l'impression (debout).
// =====================================================================
module corps_monobloc() {
    difference() {
        union() {
            base_body();
            place_dossier() back_panel();
            junction_fillets();
            side_ribs();
        }
        cable_channel_base_cut();
        // ras du sol : rien ne depasse sous z = 0
        translate([-200,-100,-50]) cube([400,400,50]);
    }
}

// =====================================================================
//  3. CACHE ARRIERE (coordonnees locales dossier, plaque contre le dos)
// =====================================================================

module cover_outline() {
    hull()
        for (p = [[-cover_w/2+cover_r, cover_y1+cover_r],
                  [ cover_w/2-cover_r, cover_y1+cover_r],
                  [-cover_w/2+cover_r, cover_y2-cover_r],
                  [ cover_w/2-cover_r, cover_y2-cover_r]])
            translate(p) circle(r=cover_r, $fn=fn_vis);
}

module rear_cover() {
    difference() {
        union() {
            // plaque a chants biseautes (aucune arete vive)
            hull() {
                translate([0,0,-0.1]) linear_extrude(height=0.1) cover_outline();
                translate([0,0,-cover_t]) linear_extrude(height=0.1)
                    offset(delta=-1.4) cover_outline();
            }
            // poussoir central : plaque le chargeur au fond de son logement
            translate([0, ms_ly, -eps])
                cylinder(h=pocket_depth-magsafe_thickness-0.3, d=40, $fn=fn_vis);
        }
        // quatre vis M3 a tete cylindrique
        for (p = cover_screws) translate([p[0], p[1], 0]) {
            translate([0,0,-cover_t-eps]) cylinder(h=cover_t+6, d=screw_pass_d, $fn=fn_hide);
            translate([0,0,-cover_t-eps]) cylinder(h=1.6, d=screw_head_d, $fn=fn_hide);
        }
        // decor "roue de secours" : anneaux concentriques graves (0,6)
        translate([0, ms_ly, 0]) {
            for (r = [12, 17, 22])
                translate([0,0,-cover_t-eps])
                    difference() {
                        cylinder(h=0.6+eps, r=r+0.5, $fn=fn_vis);
                        translate([0,0,-eps]) cylinder(h=0.8, r=r-0.5, $fn=fn_vis);
                    }
            translate([0,0,-cover_t-eps]) cylinder(h=0.6+eps, d=8, $fn=fn_vis);
        }
        // encoche de prise pour retirer le cache
        translate([0, cover_y2+1, -cover_t-1]) cylinder(h=cover_t+2, d=10, $fn=fn_vis);
    }
}

// Cache en orientation d'impression (face decoree sur le plateau)
module station_cache_print() {
    translate([0, -(cover_y1+cover_y2)/2, cover_t]) rear_cover();
}

// =====================================================================
//  4. BADGE LOGO GENERIQUE (optionnel, a coller dans son logement)
//     Aucun logo de marque protegee : simple ecusson "SC" (Scooter Club)
// =====================================================================
module logo_badge() {
    union() {
        cylinder(h=1.6, d=24, $fn=fn_vis);
        difference() {   // cerclage
            cylinder(h=2.4, d=24, $fn=fn_vis);
            translate([0,0,1]) cylinder(h=2, d=20.8, $fn=fn_vis);
        }
        translate([0,0,1.4]) linear_extrude(height=1.0)
            text("SC", size=9, font="Liberation Sans:style=Bold Italic",
                 halign="center", valign="center");
    }
}

// =====================================================================
//  5. PIECE DE TEST RAPIDE DES TOLERANCES
//     Extrait du dossier autour du logement MagSafe : logement complet
//     avec clips, morceau du canal de cable, les 4 pilotes de vis M3 du
//     cache (le vrai cache peut y etre visse pour valider fermeture et
//     jeux avant d'imprimer la station complete). S'imprime a plat.
// =====================================================================
module test_magsafe() {
    translate([0, -ms_ly, 0])
        intersection() {
            back_panel();
            translate([-38, ms_ly-42, -1]) cube([76, 84, 15]);
        }
}

// =====================================================================
//  6. ASSEMBLAGE ET VUES
// =====================================================================
module assembly() {
    color("WhiteSmoke")  corps_monobloc();
    if (use_rear_cover) color("Silver") place_dossier() rear_cover();
    if (weight_cavity) color("DimGray") weight_plate();
    if (show_logo)
        color("DarkSlateGray")
            place_dossier() translate([0, 42, dos_t-1.0]) logo_badge();
}

// Vue en coupe : plan vertical passant par l'axe du canal de cable
module cable_section() {
    difference() {
        assembly();
        translate([phone_cx, -30, -30]) cube([200, 300, 320]);
    }
}

// ---------------------------------------------------------------------
//  SELECTEUR DE PIECE
// ---------------------------------------------------------------------
if      (part == "assembly")      assembly();
else if (part == "corps")         corps_monobloc();
else if (part == "cache")         station_cache_print();
else if (part == "test")          test_magsafe();
else if (part == "logo")          logo_badge();
else if (part == "plaque")        weight_plate();
else if (part == "cable_section") cable_section();
