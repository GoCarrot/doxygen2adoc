'use strict';

import {XMLParser} from 'fast-xml-parser';
import {strict as assert} from 'assert';

const descriptionParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '$',
  textNodeName: '$text',
  preserveOrder: true,
  trimValues: false,
});

const stripEmptyElements = (arr) => {
  return arr.reduce((arr, elem) => {
    if (elem.$text?.trim() === '') return arr;
    else if (elem.trim && elem.trim() === '') return arr;
    return arr.concat([elem]);
  }, []);
};

/**
 * Helper for extracting documentation from a Doxygen compound.
 */
export default class Documentation {
  /**
   * @param {Object} xmlDef Doxygen compound.
   */
  constructor(xmlDef) {
    this.description = [];
    this.parameterDocs = {};
    this.return = [];
    this.deprecated = false;
    this.deprecatedDocs = [];
    this.note = [];
    this.warning = [];

    // Calling these functions will modify the object
    this.brief = this.#buildDescription(xmlDef.briefdescription);
    this.description = this.#buildDescription(xmlDef.detaileddescription);

    // Trim
    this.note = stripEmptyElements(this.note);
    this.warning = stripEmptyElements(this.warning);
    this.deprecatedDocs = stripEmptyElements(this.deprecatedDocs);
    this.return = stripEmptyElements(this.return);

    // Deprecated and Return should only have one section; join them
    this.deprecatedDocs = this.deprecatedDocs.join('');
    this.return = this.return.join('');
  }

  /**
   * Format a <para> element
   * @param {String} para Para element from Doxygen
   * @return {String} A formatted string
   */
  #formatPara(para) {
    return para;
  }

  /**
   * Parse and build a description.
   * @param {String} description Description string from Doxygen compound
   * @return {String} The formatted description.
   */
  #buildDescription(description) {
    const parsedDescription = descriptionParser.parse(description);
    if (!Array.isArray(parsedDescription)) return null;

    return parsedDescription.reduce((arr, para) => {
      assert.strictEqual(Object.keys(para).length, 1, '#buildDescription more than one key');
      assert.ok(para.para, '#buildDescription para element missing');

      return arr.concat(this.#parsePara(para.para));
    }, []).join('');
  }

  /**
   * Used by #buildDescription
   * @param {Object} para A para Doxygen element
   * @return {Array} Array of elements to merge into description.
   */
  #parsePara(para) {
    if (para.$text) {
      return [para.$text];
    }

    return para.reduce((arr, para) => {
      // <computeroutput>
      if (para.computeroutput) {
        // TODO: This is hard-coded asciidoc formatting
        return arr.concat(['``'], this.#parsePara(para.computeroutput), ['``']);

      // <emphasis>/<bold>
      } else if (para.emphasis || para.bold) {
        // TODO: This is hard-coded asciidoc formatting
        return arr.concat(['**'], this.#parsePara(para.emphasis || para.bold), ['**']);

      // <verbatim>/<javadoccode>
      } else if (para.verbatim || para.javadoccode) {
        // TODO: This is hard-coded asciidoc formatting
        return arr.concat(['\n[source]\n----\n'],
            this.#parsePara(para.verbatim || para.javadoccode),
            ['----\n']);

      // <simplesect>
      } else if (para.simplesect) {
        return arr.concat(this.#parseSimpleSect(para.simplesect, para[':@']));

      // <xrefsect>
      } else if (para.xrefsect) {
        return arr.concat(this.#parseXrefSect(para.xrefsect));

      // <parameterlist>
      } else if (para.parameterlist) {
        return arr.concat(this.#parseParameterList(para.parameterlist));

      // <itemizedlist>
      } else if (para.itemizedlist) {
        return arr.concat(this.#parseItemizedList(para.itemizedlist));

      // <ref>
      } else if (para.ref) {
        assert.strictEqual(para.ref.length, 1);
        assert.ok(para[':@']);

        const refid = para[':@'].$refid;
        if (refid === '') {
          // This is not a ref in our source.
          // TODO: External link to Android/iOS/Unity docs? Probably no.
          return arr.concat([para.ref[0].$text]);
        } else {
          // This is a ref to something we know about
          // assert.ok(Compound.refs[refid], `Ref for ${refid} not found.`);
          // console.log(para);
          return arr.concat([`<<${refid},${para.ref[0].$text}>>`]);
        }

      // Text
      } else if (typeof para.$text !== 'undefined') {
        return arr.concat([para.$text.toString()]);

      // Linebreak
      } else if (para.linebreak) {
        return arr.concat(['\n']);

      // <programlisting>
      } else if (para.programlisting) {
        return arr;

      // Futureproofing
      } else {
        console.log(para);
        throw new Error(`Don't know what to do with description element: ${para}`);
      }
    }, []);
  }

  /**
   * Used by #buildDescription
   * @param {Object} simplesect A simplesect Doxygen element
   * @param {Object} attributes The attributes of simplesect element
   * @return {Array} Array of elements to merge into description.
   */
  #parseSimpleSect(simplesect, attributes) {
    return simplesect.reduce((arr, simplesect) => {
      switch (attributes?.$kind) {
        case undefined:
          break;
        case 'return':
          this.return.push(this.#parsePara(simplesect.para || simplesect).join('').trim());
          return arr;
        case 'note':
          this.note.push(this.#parsePara(simplesect.para || simplesect).join('').trim());
          return arr;
        case 'warning':
          this.warning.push(this.#parsePara(simplesect.para || simplesect).join('').trim());
          return arr;
        case 'see':
          // TODO: Link reference here
          console.log(`SEE: ${simplesect}`);
          break;

        default:
          console.log(simplesect);
          throw new Error(`Don't know what to do with simplesect.$kind ${kind}.`);
      }

      if (simplesect.$text) {
        assert.strictEqual(Object.keys(simplesect).length, 1,
            'simplesect with $text contains more than $text');

        return arr.concat([simplesect.$text]);
      } else if (simplesect.para) {
        return arr.concat(this.#parsePara(simplesect.para));
      }

      return arr;
    }, []);
  }

  /**
   * Used by #buildDescription
   * @param {Object} xrefsect A xrefsect Doxygen element
   * @return {Array} Array of elements to merge into description.
   */
  #parseXrefSect(xrefsect) {
    assert.strictEqual(xrefsect.length, 2);

    assert.strictEqual(xrefsect[0].xreftitle.length, 1);
    assert.ok(xrefsect[0].xreftitle[0].$text);
    const xreftitle = xrefsect[0].xreftitle[0].$text;

    if (xreftitle === 'Deprecated') {
      this.deprecated = true;

      assert.strictEqual(Object.keys(xrefsect[1]).length, 1);
      assert.ok(xrefsect[1].xrefdescription);
      const xrefdescription = xrefsect[1].xrefdescription;

      this.deprecatedDocs =
        this.deprecatedDocs.concat(xrefdescription.reduce((arr, xrefdescription) => {
          assert.ok(xrefdescription);
          assert.strictEqual(Object.keys(xrefdescription).length, 1);

          return arr.concat(this.#parsePara(xrefdescription.para || xrefdescription));
        }, []));
    } else {
      throw new Error(`Don't know how to parse xrefsect: ${xreftitle}`);
    }

    return [];
  }

  /**
   * Used by #buildDescription
   * @param {Object} parameterlist A parameterlist Doxygen element
   * @return {Array} Array of elements to merge into description.
   */
  #parseParameterList(parameterlist) {
    return parameterlist.reduce((arr, parameterlist) => {
      if (parameterlist.$text === '\n') {
        return arr;
      }

      assert.ok(parameterlist.parameteritem);

      const parameteritem = stripEmptyElements(parameterlist.parameteritem);
      assert.strictEqual(parameteritem.length, 2);
      assert.ok(parameteritem[0].parameternamelist);
      assert.ok(parameteritem[1].parameterdescription);
      assert.strictEqual(parameteritem[0].parameternamelist.length,
          parameteritem[1].parameterdescription.length);

      const parameternamelist = stripEmptyElements(parameteritem[0].parameternamelist)[0];
      const parameterdescription = stripEmptyElements(parameteritem[1].parameterdescription)[0];

      assert.ok(parameternamelist.parametername);
      assert.ok(parameternamelist.parametername[0]);
      assert.ok(parameternamelist.parametername[0].$text);
      const parametername = parameternamelist.parametername[0].$text;

      assert.ok(parameterdescription.para);
      this.parameterDocs[parametername] = this.#parsePara(parameterdescription.para).join('');

      return arr;
    }, []);
  }

  /**
   * Used by #buildDescription
   * @param {Object} itemizedlist A itemizedlist Doxygen element
   * @return {Array} Array of elements to merge into description.
   */
  #parseItemizedList(itemizedlist) {
    return itemizedlist.reduce((arr, itemizedlist) => {
      if (itemizedlist.listitem) {
        return arr.concat(stripEmptyElements(itemizedlist.listitem).reduce((arr, listitem) => {
          // TODO: This is hard-coded asciidoc formatting
          const parsedListItem = this.#parsePara(listitem.para || listitem);
          return arr.concat([`\n* ${parsedListItem.join('')}`]);
        }, []));
      } else if (itemizedlist.$text === '\n') {
        return arr.concat(['\n']);
      } else {
        console.log(itemizedlist);
        throw new Error(`Don't know what to do with itemizedlist ${itemizedlist}`);
      }
    }, []);
  }
}
