import {mountWithTheme} from 'sentry-test/enzyme';

import JsonForm from 'sentry/components/forms/jsonForm';
import accountDetailsFields from 'sentry/data/forms/accountDetails';
import {fields} from 'sentry/data/forms/projectGeneralSettings';

const user = TestStubs.User({});

describe('JsonForm', function () {
  describe('form prop', function () {
    it('default', function () {
      const wrapper = mountWithTheme(
        <JsonForm forms={accountDetailsFields} additionalFieldProps={{user}} />
      );
      expect(wrapper).toSnapshot();
    });

    it('missing additionalFieldProps required in "valid" prop', function () {
      // eslint-disable-next-line no-console
      jest.spyOn(console, 'error').mockImplementation(jest.fn());
      try {
        mountWithTheme(<JsonForm forms={accountDetailsFields} />);
      } catch (error) {
        expect(error.message).toBe(
          "Cannot read properties of undefined (reading 'email')"
        );
      }
    });

    it('should ALWAYS hide panel, if all fields have visible set to false  AND there is no renderHeader & renderFooter -  visible prop is of type boolean', function () {
      const modifiedAccountDetails = accountDetailsFields.map(accountDetailsField => ({
        ...accountDetailsField,
        fields: accountDetailsField.fields.map(field => ({...field, visible: false})),
      }));

      const wrapper = mountWithTheme(
        <JsonForm forms={modifiedAccountDetails} additionalFieldProps={{user}} />
      );

      expect(wrapper.find('FormPanel')).toHaveLength(0);
    });

    it('should ALWAYS hide panel, if all fields have visible set to false AND there is no renderHeader & renderFooter -  visible prop is of type func', function () {
      const modifiedAccountDetails = accountDetailsFields.map(accountDetailsField => ({
        ...accountDetailsField,
        fields: accountDetailsField.fields.map(field => ({
          ...field,
          visible: () => false,
        })),
      }));

      const wrapper = mountWithTheme(
        <JsonForm forms={modifiedAccountDetails} additionalFieldProps={{user}} />
      );

      expect(wrapper.find('FormPanel')).toHaveLength(0);
    });

    it('should NOT hide panel, if at least one field has visible set to true -  no visible prop (1 field) + visible prop is of type func (2 field)', function () {
      // accountDetailsFields has two fields. The second field will always have visible set to false, because the username and the email are the same 'foo@example.com'
      const wrapper = mountWithTheme(
        <JsonForm forms={accountDetailsFields} additionalFieldProps={{user}} />
      );

      expect(wrapper.find('FormPanel')).toHaveLength(1);
      expect(wrapper.find('input')).toHaveLength(1);
    });

    it('should NOT hide panel, if all fields have visible set to false AND a prop renderHeader is passed', function () {
      const modifiedAccountDetails = accountDetailsFields.map(accountDetailsField => ({
        ...accountDetailsField,
        fields: accountDetailsField.fields.map(field => ({...field, visible: false})),
      }));

      const wrapper = mountWithTheme(
        <JsonForm
          forms={modifiedAccountDetails}
          additionalFieldProps={{user}}
          renderHeader={() => <div>this is a Header </div>}
        />
      );

      expect(wrapper.find('FormPanel')).toHaveLength(1);
      expect(wrapper.find('input')).toHaveLength(0);
    });

    it('should NOT hide panel, if all fields have visible set to false AND a prop renderFooter is passed', function () {
      const modifiedAccountDetails = accountDetailsFields.map(accountDetailsField => ({
        ...accountDetailsField,
        fields: accountDetailsField.fields.map(field => ({...field, visible: false})),
      }));

      const wrapper = mountWithTheme(
        <JsonForm
          forms={modifiedAccountDetails}
          additionalFieldProps={{user}}
          renderFooter={() => <div>this is a Footer </div>}
        />
      );

      expect(wrapper.find('FormPanel')).toHaveLength(1);
      expect(wrapper.find('input')).toHaveLength(0);
    });
  });

  describe('fields prop', function () {
    const jsonFormFields = [fields.name, fields.platform];

    it('default', function () {
      const wrapper = mountWithTheme(<JsonForm fields={jsonFormFields} />);
      expect(wrapper).toSnapshot();
    });

    it('missing additionalFieldProps required in "valid" prop', function () {
      // eslint-disable-next-line no-console
      jest.spyOn(console, 'error').mockImplementation(jest.fn());
      try {
        mountWithTheme(
          <JsonForm
            fields={[{...jsonFormFields[0], visible: ({test}) => !!test.email}]}
          />
        );
      } catch (error) {
        expect(error.message).toBe(
          "Cannot read properties of undefined (reading 'email')"
        );
      }
    });

    it('should NOT hide panel, if at least one field has visible set to true - no visible prop', function () {
      // slug and platform have no visible prop, that means they will be always visible
      const wrapper = mountWithTheme(<JsonForm fields={jsonFormFields} />);
      expect(wrapper.find('FormPanel')).toHaveLength(1);
      expect(wrapper.find('input[type="text"]')).toHaveLength(2);
    });

    it('should NOT hide panel, if at least one field has visible set to true -  visible prop is of type boolean', function () {
      // slug and platform have no visible prop, that means they will be always visible
      const wrapper = mountWithTheme(
        <JsonForm fields={jsonFormFields.map(field => ({...field, visible: true}))} />
      );
      expect(wrapper.find('FormPanel')).toHaveLength(1);
      expect(wrapper.find('input[type="text"]')).toHaveLength(2);
    });

    it('should NOT hide panel, if at least one field has visible set to true -  visible prop is of type func', function () {
      // slug and platform have no visible prop, that means they will be always visible
      const wrapper = mountWithTheme(
        <JsonForm
          fields={jsonFormFields.map(field => ({...field, visible: () => true}))}
        />
      );
      expect(wrapper.find('FormPanel')).toHaveLength(1);
      expect(wrapper.find('input[type="text"]')).toHaveLength(2);
    });

    it('should ALWAYS hide panel, if all fields have visible set to false -  visible prop is of type boolean', function () {
      // slug and platform have no visible prop, that means they will be always visible
      const wrapper = mountWithTheme(
        <JsonForm fields={jsonFormFields.map(field => ({...field, visible: false}))} />
      );
      expect(wrapper.find('FormPanel')).toHaveLength(0);
    });

    it('should ALWAYS hide panel, if all fields have visible set to false - visible prop is of type function', function () {
      // slug and platform have no visible prop, that means they will be always visible
      const wrapper = mountWithTheme(
        <JsonForm
          fields={jsonFormFields.map(field => ({...field, visible: () => false}))}
        />
      );
      expect(wrapper.find('FormPanel')).toHaveLength(0);
    });
  });
});
